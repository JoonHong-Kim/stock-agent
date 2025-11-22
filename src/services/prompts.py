import textwrap
from typing import List, Dict, Any
from .price_service import PriceSnapshot

class PromptManager:
    @staticmethod
    def build_report_prompt(
        symbol: str,
        article_context: str,
        price: PriceSnapshot,
        article_count: int,
    ) -> str:
        price_lines = "\n".join(
            [
                f"- 현재가: {PromptManager._format_price(price.current)}",
                f"- 전일 종가: {PromptManager._format_price(price.previous_close)}",
                f"- 당일 시가: {PromptManager._format_price(price.open_price)}",
                f"- 변동률: {PromptManager._format_percent(price.percent_change)}",
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
    def build_aggregate_prompt(
        aggregate_context: str, 
        symbol_count: int, 
        indices: Dict[str, PriceSnapshot]
    ) -> str:
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
    def build_system_prompt() -> str:
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
