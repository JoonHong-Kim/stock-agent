from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
import textwrap
from typing import List, Sequence

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ..config import get_settings
from ..db.models import Article, Report, Ticker, WatchedSymbol
from ..schemas import ReportOut, ReportType
from ..util import normalize_symbol
from .llm_service import LLMService, LLMServiceError
from .price_service import PriceService, PriceSnapshot


settings = get_settings()


class ReportGenerationError(Exception):
    """Domain-level error raised for invalid inputs or missing context."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


class AISummaryService:
    """Creates AI-assisted smart briefings anchored on stored article bodies."""

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        llm_service: LLMService,
        price_service: PriceService,
    ) -> None:
        self._sessions = session_factory
        self._llm = llm_service
        self._price_service = price_service

    async def generate_report(
        self,
        symbol: str,
        report_type: ReportType = ReportType.SMART_BRIEFING,
        limit: int = 20,
    ) -> ReportOut:
        normalized = normalize_symbol(symbol)
        async with self._sessions() as session:
            await self._ensure_symbol_is_watched(session, normalized)
            articles = await self._fetch_recent_articles(session, normalized, limit)
            if not articles:
                raise ReportGenerationError(
                    "최근 기사 데이터가 없어 리포트를 생성할 수 없습니다."
                )
            try:
                price = await self._price_service.fetch_quote(normalized)
            except Exception:
                price = PriceSnapshot(symbol=normalized, current=None, open_price=None, previous_close=None, percent_change=None)
            article_context = self._build_article_context(articles)
            user_prompt = self._build_report_prompt(
                normalized, article_context, price, len(articles)
            )
            system_prompt = self._build_system_prompt()
            try:
                content = await self._llm.complete(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=0.2,
                    max_tokens=1200,
                )
                # Validate JSON structure
                try:
                    json.loads(content)
                except json.JSONDecodeError:
                    # If LLM returns markdown fenced code block, try to strip it
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0].strip()
                        json.loads(content) # Verify again
                    else:
                        raise LLMServiceError("LLM did not return valid JSON.")
            except (LLMServiceError, Exception):
                content = self._fallback_content(normalized, articles, price)

            # Always force type to SMART_BRIEFING for new reports
            row = Report(symbol=normalized, type=ReportType.SMART_BRIEFING.value, content=content)
            session.add(row)
            await session.commit()
            await session.refresh(row)
            return ReportOut.model_validate(row)

    async def generate_aggregate_report(self, limit_per_symbol: int = 10) -> ReportOut:
        """Generate an aggregate report for ALL watchlist symbols."""
        async with self._sessions() as session:
            # Fetch all watched symbols except WATCHLIST itself
            stmt = select(WatchedSymbol.symbol).where(WatchedSymbol.symbol != "WATCHLIST")
            result = await session.execute(stmt)
            symbols = result.scalars().all()

            if not symbols:
                raise ReportGenerationError("워치리스트가 비어 있어 종합 브리핑을 생성할 수 없습니다.")

            # Ensure WATCHLIST watched symbol exists
            await self._ensure_symbol_is_watched(session, "WATCHLIST")

            # Collect data for each symbol
            symbol_insights = {}
            all_articles = []
            
            for symbol in symbols:
                try:
                    articles = await self._fetch_recent_articles(session, symbol, limit_per_symbol)
                    if articles:
                        all_articles.extend(articles)
                        # Get price for each symbol
                        try:
                            price = await self._price_service.fetch_quote(symbol)
                        except Exception:
                            price = PriceSnapshot(symbol=symbol, current=None, open_price=None, previous_close=None, percent_change=None)
                        symbol_insights[symbol] = {
                            "article_count": len(articles),
                            "price_change": price.percent_change if price else 0,
                            "articles": articles,
                            "price": price
                        }
                except Exception as e:
                    # Skip symbols that fail
                    print(f"Failed to fetch data for {symbol}: {e}")
                    continue

            if not all_articles:
                raise ReportGenerationError("워치리스트 종목들의 최근 기사가 없습니다.")

            # Fetch market indices
            indices = {}
            for symbol, name in [("^IXIC", "Nasdaq"), ("^GSPC", "S&P 500")]:
                try:
                    price = await self._price_service.fetch_quote(symbol)
                    indices[name] = price
                except Exception:
                    indices[name] = PriceSnapshot(symbol=symbol, current=None, open_price=None, previous_close=None, percent_change=None)

            # Build aggregate context
            aggregate_context = self._build_aggregate_context(symbol_insights)
            user_prompt = self._build_aggregate_prompt(aggregate_context, len(symbols), indices)
            system_prompt = self._build_system_prompt()

            try:
                content = await self._llm.complete(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=0.2,
                    max_tokens=2000,
                )
                # Validate JSON
                try:
                    json.loads(content)
                except json.JSONDecodeError:
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0].strip()
                        json.loads(content)
                    else:
                        raise LLMServiceError("LLM did not return valid JSON.")
            except (LLMServiceError, Exception):
                content = self._fallback_aggregate_content(symbol_insights)

            # Save with WATCHLIST symbol
            row = Report(symbol="WATCHLIST", type=ReportType.SMART_BRIEFING.value, content=content)
            session.add(row)
            await session.commit()
            await session.refresh(row)
            return ReportOut.model_validate(row)


    async def get_report(self, report_id: int) -> ReportOut:
        async with self._sessions() as session:
            result = await session.execute(
                select(Report).where(Report.id == report_id)
            )
            report = result.scalar_one_or_none()
            if not report:
                raise ReportGenerationError("요청한 리포트를 찾을 수 없습니다.", status_code=404)
            return ReportOut.model_validate(report)

    async def list_reports(
        self,
        limit: int = 10,
        symbol: str | None = None,
    ) -> List[ReportOut]:
        normalized = normalize_symbol(symbol) if symbol else None
        async with self._sessions() as session:
            stmt = select(Report).order_by(Report.created_at.desc()).limit(limit)
            if normalized:
                stmt = stmt.where(Report.symbol == normalized)
            result = await session.execute(stmt)
            rows = result.scalars().all()
            return [ReportOut.model_validate(row) for row in rows]

    async def _ensure_symbol_is_watched(
        self, session: AsyncSession, symbol: str
    ) -> None:
        """Ensure symbol exists in watchlist. WATCHLIST sentinel is exempted."""
        # WATCHLIST is a special sentinel value for aggregate reports
        # Since we removed the FK constraint from Report.symbol, it doesn't need to exist in watched_symbols
        if symbol == "WATCHLIST":
            return
        
        # For regular symbols, verify they're in the watchlist
        result = await session.execute(
            select(WatchedSymbol.symbol).where(WatchedSymbol.symbol == symbol)
        )
        exists = result.scalar_one_or_none()
        if not exists:
            raise ReportGenerationError(
                "watchlist에 추가된 심볼만 분석할 수 있습니다.", status_code=404
            )

    async def _fetch_recent_articles(
        self, session: AsyncSession, symbol: str, limit: int
    ) -> Sequence[Article]:
        lookback = datetime.now(timezone.utc) - timedelta(
            days=settings.report_article_lookback_days
        )
        stmt = (
            select(Article)
            .where(Article.symbol == symbol)
            .where(
                or_(
                    Article.published_at.is_(None),
                    Article.published_at >= lookback,
                )
            )
            .order_by(Article.published_at.desc().nullslast(), Article.id.desc())
            .limit(limit)
        )
        result = await session.execute(stmt)
        return result.scalars().all()

    @staticmethod
    def _build_article_context(articles: Sequence[Article]) -> str:
        lines: List[str] = []
        for article in articles:
            timestamp = (
                article.published_at.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
                if article.published_at
                else "발행시각 알 수 없음"
            )
            summary = article.summary or "요약 없음"
            lines.append(
                f"[기사#{article.id}] {article.headline} | 출처: {article.source or '정보 없음'} | {timestamp}\n"
                f"요약: {summary}"
            )
        return "\n".join(lines)

    def _build_report_prompt(
        self,
        symbol: str,
        article_context: str,
        price: PriceSnapshot,
        article_count: int,
    ) -> str:
        price_lines = "\n".join(
            [
                f"- 현재가: {self._format_price(price.current)}",
                f"- 전일 종가: {self._format_price(price.previous_close)}",
                f"- 당일 시가: {self._format_price(price.open_price)}",
                f"- 변동률: {self._format_percent(price.percent_change)}",
            ]
        )
        header = textwrap.dedent(
            f"""
            티커: {symbol}
            기사 수: {article_count}
            가격 정보:
            {price_lines}
            기사 컨텍스트:
            {article_context}
            """
        ).strip()

        instructions = textwrap.dedent("""
            위 데이터를 바탕으로 투자자를 위한 'Smart Briefing'을 작성하세요.
            반드시 아래 JSON 형식을 준수하여 응답해야 합니다. Markdown 포맷팅은 사용하지 마세요.

            {
                "summary": [
                    "핵심 요약 1 (가격 움직임과 기사 연결)",
                    "핵심 요약 2 (주요 이슈)",
                    "핵심 요약 3 (향후 전망)"
                ],
                "sentiment_score": 50,  // 0(매우 부정) ~ 100(매우 긍정)
                "sentiment_reason": "점수 산정 근거 (한 문장)",
                "key_risks": [
                    "리스크 요인 1",
                    "리스크 요인 2"
                ],
                "market_outlook": "시장 전반적인 분위기와 해당 종목의 단기 전망 (2문장 이내)"
            }

            주의사항:
            1. summary는 반드시 3개 항목이어야 합니다.
            2. sentiment_score는 정수형입니다.
            3. 모든 텍스트는 한국어로 작성하세요.
            4. 기사 ID가 있다면 (기사#ID) 형태로 언급하세요.
        """).strip()

        return f"{header}\n\n지시사항:\n{instructions}"

    @staticmethod
    def _build_system_prompt() -> str:
        return (
            "당신은 금융 데이터를 분석하여 JSON 형식으로 인사이트를 제공하는 AI 어시스턴트입니다. "
            "주어진 데이터에 기반하여 객관적이고 전문적인 분석을 제공하세요."
        )

    @staticmethod
    def _format_price(value: float | None) -> str:
        if value is None:
            return "데이터 없음"
        return f"${value:,.2f}"

    @staticmethod
    def _format_percent(value: float | None) -> str:
        if value is None:
            return "데이터 없음"
        return f"{value:+.2f}%"

    def _fallback_content(
        self,
        symbol: str,
        articles: Sequence[Article],
        price: PriceSnapshot,
    ) -> str:
        # Fallback JSON structure
        return json.dumps({
            "summary": [
                f"{article.headline} (기사#{article.id})" for article in articles[:3]
            ] or ["최근 기사가 없습니다."],
            "sentiment_score": 50,
            "sentiment_reason": "데이터 부족 또는 LLM 오류로 인한 기본값입니다.",
            "key_risks": ["분석 불가"],
            "market_outlook": "데이터를 불러올 수 없습니다."
        }, ensure_ascii=False)

    @staticmethod
    def _build_aggregate_context(symbol_insights: dict) -> str:
        """Build context for aggregate report from multiple symbols."""
        lines: List[str] = []
        for symbol, data in symbol_insights.items():
            price_change = data.get("price_change") or 0.0
            article_count = data.get("article_count", 0)
            lines.append(f"[{symbol}] 변동률: {price_change:+.2f}%, 기사 수: {article_count}")
            # Add top 2 article headlines for context
            for article in data.get("articles", [])[:2]:
                lines.append(f"  - {article.headline}")
        return "\n".join(lines)

    @staticmethod
    def _build_aggregate_prompt(aggregate_context: str, symbol_count: int, indices: dict[str, PriceSnapshot]) -> str:
        """Build prompt for aggregate briefing."""
        indices_text = "\n".join(
            [
                f"- {name}: {price.current:,.2f} ({price.percent_change:+.2f}%)"
                if price.current is not None and price.percent_change is not None
                else f"- {name}: 데이터 없음"
                for name, price in indices.items()
            ]
        )

        header = textwrap.dedent(f"""
            워치리스트 종합 브리핑
            감시 종목 수: {symbol_count}

            주요 시장 지수:
            {indices_text}

            종목별 현황:
            {aggregate_context}
        """).strip()

        instructions = textwrap.dedent("""
            위 데이터를 바탕으로 워치리스트 전체를 요약하는 종합 브리핑을 작성하세요.
            반드시 아래 JSON 형식을 준수하여 응답해야 합니다.

            {
                "overall_sentiment": 60,  // 전체 워치리스트의 평균적인 투자 심리 (0-100)
                "overall_sentiment_reason": "전체 심리 점수 산정 근거",
                "market_summary": "주요 시장 지수(나스닥, S&P500)와 워치리스트 종목들의 전반적인 흐름 요약 (3문장 이내)",
                "market_indices": [
                    {
                        "name": "Nasdaq",
                        "price": 14000.00,
                        "change": 1.25
                    },
                    {
                        "name": "S&P 500",
                        "price": 4500.00,
                        "change": 0.50
                    }
                ],
                "top_movers": ["AAPL", "TSLA"],  // 가장 큰 변동을 보인 종목 (최대 3개)
                "key_themes": [
                    "AI 기술 발전으로 관련주 상승",
                    "금리 인하 기대감 확산"
                ],
                "individual_insights": {
                    "AAPL": {
                        "sentiment": 75,
                        "one_liner": "신제품 발표로 긍정적 흐름"
                    },
                    "TSLA": {
                        "sentiment": 55,
                        "one_liner": "생산량 감소 우려"
                    }
                }
            }

            주의사항:
            1. key_themes는 2-4개 항목
            2. individual_insights는 모든 워치리스트 종목 포함
            3. 모든 텍스트는 한국어로 작성
            4. market_indices의 값은 입력된 데이터를 그대로 사용
        """).strip()

        return f"{header}\n\n지시사항:\n{instructions}"

    @staticmethod
    def _fallback_aggregate_content(symbol_insights: dict) -> str:
        """Fallback content for aggregate reports when LLM fails."""
        individual_insights = {}
        for symbol, data in symbol_insights.items():
            price_change = data.get("price_change") or 0.0
            individual_insights[symbol] = {
                "sentiment": 50,
                "one_liner": f"기사 {data.get('article_count', 0)}건, 변동률 {price_change:+.2f}%"
            }

        return json.dumps({
            "overall_sentiment": 50,
            "overall_sentiment_reason": "LLM 오류로 인한 기본값",
            "market_summary": "종합 분석을 생성할 수 없습니다.",
            "top_movers": list(symbol_insights.keys())[:3],
            "key_themes": ["데이터 분석 불가"],
            "individual_insights": individual_insights
        }, ensure_ascii=False)

