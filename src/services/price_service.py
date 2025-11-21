from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import httpx

from ..config import get_settings


settings = get_settings()


@dataclass
class PriceSnapshot:
    symbol: str
    current: Optional[float]
    open_price: Optional[float]
    previous_close: Optional[float]
    percent_change: Optional[float]


class PriceService:
    """Fetches latest quote data for a symbol using Finnhub."""

    async def fetch_quote(self, symbol: str) -> PriceSnapshot:
        if not settings.finnhub_api_key:
            # Without an API key we still return a deterministic payload so the UI
            # can show placeholders instead of failing outright.
            return PriceSnapshot(
                symbol=symbol,
                current=None,
                open_price=None,
                previous_close=None,
                percent_change=None,
            )

        params = {"symbol": symbol.upper(), "token": settings.finnhub_api_key}
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(str(settings.finnhub_quote_url), params=params)
            response.raise_for_status()
            payload = response.json()

        current = _safe_float(payload.get("c"))
        open_price = _safe_float(payload.get("o"))
        previous_close = _safe_float(payload.get("pc"))
        percent_change = None
        if current is not None and previous_close not in (None, 0):
            percent_change = ((current - previous_close) / previous_close) * 100
        return PriceSnapshot(
            symbol=symbol.upper(),
            current=current,
            open_price=open_price,
            previous_close=previous_close,
            percent_change=percent_change,
        )


def _safe_float(value) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None
