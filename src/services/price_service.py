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

    async def fetch_market_summary(self, watchlist_symbols: list[str]) -> dict:
        """Fetch indices and calculate top movers from watchlist."""
        indices = []
        # Use ETFs as proxies for indices if direct index data is unavailable on free tier
        # ^IXIC -> QQQ (Nasdaq 100 ETF), ^GSPC -> SPY (S&P 500 ETF)
        # We try real indices first, then fallback to ETFs if needed.
        # Actually, for simplicity and reliability on free plans, let's just use the ETFs or well-known proxies.
        # But let's try both for robustness.
        index_targets = [
            ("^IXIC", "Nasdaq", "QQQ"), 
            ("^GSPC", "S&P 500", "SPY")
        ]
        
        for symbol, name, proxy in index_targets:
            snapshot = await self.fetch_quote(symbol)
            # If main symbol fails (price is 0 or None), try proxy
            if not snapshot or snapshot.current is None or snapshot.current == 0:
                snapshot = await self.fetch_quote(proxy)
            
            if snapshot and snapshot.current is not None:
                indices.append({
                    "symbol": symbol, # Keep original symbol name for display if desired, or use name
                    "name": name,
                    "price": snapshot.current,
                    "change": (snapshot.current - (snapshot.previous_close or 0)),
                    "change_percent": snapshot.percent_change or 0.0
                })

        movers = []
        import asyncio
        
        # Limit concurrency to avoid overwhelming the API or hitting rate limits
        semaphore = asyncio.Semaphore(5)

        async def fetch_with_semaphore(sym):
            async with semaphore:
                return await self.fetch_quote(sym)

        tasks = [fetch_with_semaphore(sym) for sym in watchlist_symbols]
        snapshots = await asyncio.gather(*tasks, return_exceptions=True)

        for snap in snapshots:
            if isinstance(snap, PriceSnapshot) and snap.current is not None and snap.percent_change is not None:
                movers.append({
                    "symbol": snap.symbol,
                    "price": snap.current,
                    "change": (snap.current - (snap.previous_close or 0)),
                    "change_percent": snap.percent_change
                })

        # Separate gainers and losers
        gainers = [m for m in movers if m["change_percent"] > 0]
        losers = [m for m in movers if m["change_percent"] < 0]

        # Sort
        gainers.sort(key=lambda x: x["change_percent"], reverse=True) # Highest positive first
        losers.sort(key=lambda x: x["change_percent"]) # Lowest negative first (most negative)
        
        return {
            "indices": indices,
            "top_gainers": gainers[:3],
            "top_losers": losers[:3]
        }


def _safe_float(value) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None
