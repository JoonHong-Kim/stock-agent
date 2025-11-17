from __future__ import annotations

from typing import List

import httpx
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db.models import Ticker
from ..schemas import TickerSyncResult


settings = get_settings()


async def sync_tickers_from_finnhub(session: AsyncSession) -> TickerSyncResult:
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

    payload = _build_payload(data)
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
    rows = result.scalars().all()
    if rows:
        await session.commit()
    return TickerSyncResult(total=len(payload), inserted_or_updated=len(rows))


def _build_payload(data: List[dict]) -> List[dict]:
    payload: List[dict] = []
    for item in data:
        symbol = (item.get("symbol") or "").upper()
        if not symbol:
            continue
        payload.append(
            {
                "symbol": symbol,
                "name": item.get("description"),
                "exchange": item.get("exchange"),
                "mic": item.get("mic"),
                "currency": item.get("currency"),
                "type": item.get("type"),
                "is_active": not item.get("delisted"),
            }
        )
    return payload
