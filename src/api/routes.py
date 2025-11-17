from __future__ import annotations

from typing import List, Optional, Sequence, Set

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db.session import get_session
from ..db.models import Article, Ticker, WatchedSymbol
from ..schemas import (
    ArticleOut,
    BodyBackfillResult,
    RefreshRequest,
    SymbolOut,
    TickerOut,
    TickerSyncResult,
    WatchlistRequest,
)
from ..util import ensure_list, normalize_symbol, parse_symbols


router = APIRouter(prefix="/api", tags=["stock-news"])
settings = get_settings()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/watchlist", response_model=List[SymbolOut])
async def get_watchlist(session: AsyncSession = Depends(get_session)) -> List[SymbolOut]:
    result = await session.execute(select(WatchedSymbol).order_by(WatchedSymbol.symbol))
    symbols = result.scalars().all()
    return [SymbolOut.model_validate(symbol) for symbol in symbols]


@router.post("/watchlist", response_model=List[SymbolOut])
async def add_symbols(
    payload: WatchlistRequest, session: AsyncSession = Depends(get_session)
) -> List[SymbolOut]:
    normalized = ensure_list(payload.symbols)
    unique_symbols = sorted(set(normalized))
    if not unique_symbols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one valid ticker symbol is required.",
        )

    await _ensure_symbols_exist(unique_symbols, session)

    await session.execute(
        insert(WatchedSymbol)
        .values([{"symbol": symbol} for symbol in unique_symbols])
        .on_conflict_do_nothing(index_elements=[WatchedSymbol.symbol])
    )
    await session.commit()

    return await get_watchlist(session)


@router.delete(
    "/watchlist/{symbol}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_symbol(symbol: str, session: AsyncSession = Depends(get_session)) -> Response:
    normalized = normalize_symbol(symbol)
    await session.execute(delete(Article).where(Article.symbol == normalized))
    await session.execute(delete(WatchedSymbol).where(WatchedSymbol.symbol == normalized))
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/news", response_model=List[ArticleOut])
async def list_news(
    symbols: Optional[str] = Query(
        default=None,
        description="Comma separated ticker symbols to filter on.",
    ),
    limit: int = Query(default=50, le=200),
    session: AsyncSession = Depends(get_session),
) -> List[ArticleOut]:
    query = select(Article).order_by(
        Article.published_at.desc().nullslast(), Article.id.desc()
    )
    if symbols:
        selected = parse_symbols(symbols)
        if selected:
            query = query.where(Article.symbol.in_(selected))

    query = query.limit(limit)
    result = await session.execute(query)
    rows = result.scalars().all()
    return [ArticleOut.model_validate(row) for row in rows]


@router.post("/news/refresh", response_model=List[ArticleOut])
async def refresh_news(
    request: Request,
    payload: RefreshRequest | None = Body(default=None),
) -> List[ArticleOut]:
    dispatcher = getattr(request.app.state, "dispatcher", None)
    if dispatcher is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="News dispatcher is not available.",
        )
    symbols = payload.symbols if payload else None
    result = await dispatcher.broadcast_latest(symbols)
    return result


@router.post("/news/backfill-body", response_model=BodyBackfillResult)
async def backfill_article_bodies(
    request: Request,
    limit: int = Body(default=20, embed=True, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
) -> BodyBackfillResult:
    body_fetcher = getattr(request.app.state, "body_fetcher", None)
    if body_fetcher is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Body fetcher is not available.",
        )
    result = await session.execute(
        select(Article)
        .where(Article.body.is_(None))
        .order_by(Article.id.asc())
        .limit(limit)
    )
    rows = result.scalars().all()
    updated = 0
    for row in rows:
        body = await body_fetcher.fetch(row.url)
        if body:
            await session.execute(
                update(Article).where(Article.id == row.id).values(body=body)
            )
            updated += 1
    if updated:
        await session.commit()
    return BodyBackfillResult(processed=len(rows), updated=updated)


@router.get("/tickers", response_model=List[TickerOut])
async def list_tickers(
    query: Optional[str] = Query(default=None, description="Symbol or name search"),
    limit: int = Query(default=1000, le=10000),
    session: AsyncSession = Depends(get_session),
) -> List[TickerOut]:
    stmt = select(Ticker).where(Ticker.is_active.is_(True)).order_by(Ticker.symbol).limit(limit)
    if query:
        pattern = f"%{query.upper()}%"
        stmt = stmt.where(
            or_(Ticker.symbol.ilike(pattern), Ticker.name.ilike(pattern))
        )
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [TickerOut.model_validate(row) for row in rows]


@router.post("/tickers/sync", response_model=TickerSyncResult)
async def sync_tickers(session: AsyncSession = Depends(get_session)) -> TickerSyncResult:
    if not settings.finnhub_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="FINNHUB_API_KEY is required to sync tickers.",
        )
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            str(settings.finnhub_symbol_url),
            params={
                "exchange": settings.finnhub_symbol_exchange,
                "token": settings.finnhub_api_key,
            },
        )
        response.raise_for_status()
        data = response.json()

    payload = [
        {
            "symbol": (item.get("symbol") or "").upper(),
            "name": item.get("description"),
            "exchange": item.get("exchange"),
            "mic": item.get("mic"),
            "currency": item.get("currency"),
            "type": item.get("type"),
            "is_active": not item.get("delisted"),
        }
        for item in data
        if item.get("symbol")
    ]

    if not payload:
        return TickerSyncResult(total=0, inserted_or_updated=0)

    insert_stmt = insert(Ticker).values(payload)
    update_columns = {
        "name": insert_stmt.excluded.name,
        "exchange": insert_stmt.excluded.exchange,
        "mic": insert_stmt.excluded.mic,
        "currency": insert_stmt.excluded.currency,
        "type": insert_stmt.excluded.type,
        "is_active": insert_stmt.excluded.is_active,
        "updated_at": func.now(),
    }
    insert_stmt = insert_stmt.on_conflict_do_update(
        index_elements=[Ticker.symbol], set_=update_columns
    ).returning(Ticker.symbol)

    result = await session.execute(insert_stmt)
    await session.commit()
    rows = result.scalars().all()
    return TickerSyncResult(total=len(payload), inserted_or_updated=len(rows))


async def _ensure_symbols_exist(
    symbols: Sequence[str], session: AsyncSession
) -> None:
    result = await session.execute(
        select(Ticker.symbol).where(Ticker.symbol.in_(symbols))
    )
    found: Set[str] = set(result.scalars().all())
    missing = sorted(set(symbols) - found)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지원하지 않는 티커입니다.",
        )
