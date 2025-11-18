from __future__ import annotations

from typing import Iterable, List

import httpx
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db.models import Ticker
from ..schemas import TickerSyncResult


settings = get_settings()
CHUNK_SIZE = 1000  # stay under Postgres' 65535-parameter limit comfortably


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

    total_updated = 0
    for chunk in _chunk_payload(payload, CHUNK_SIZE):
        insert_stmt = insert(Ticker).values(list(chunk))
        update_columns = {
            "name": insert_stmt.excluded.name,
            "exchange": insert_stmt.excluded.exchange,
            "mic": insert_stmt.excluded.mic,
            "currency": insert_stmt.excluded.currency,
            "type": insert_stmt.excluded.type,
            "is_active": insert_stmt.excluded.is_active,
            "updated_at": func.now(),
        }
        upsert_stmt = insert_stmt.on_conflict_do_update(
            index_elements=[Ticker.symbol], set_=update_columns
        ).returning(Ticker.symbol)
        result = await session.execute(upsert_stmt)
        total_updated += len(result.scalars().all())

    if total_updated:
        await session.commit()
    return TickerSyncResult(total=len(payload), inserted_or_updated=total_updated)


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


def _chunk_payload(values: List[dict], size: int) -> Iterable[List[dict]]:
    for index in range(0, len(values), size):
        yield values[index : index + size]
