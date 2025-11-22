import asyncio
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
    
    # Shared semaphore to limit concurrency across all instances/requests
    _semaphore = asyncio.Semaphore(5)

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
        
        # Use configured indices and proxies
        for symbol in settings.market_indices:
            name = settings.market_index_names.get(symbol, symbol)
            proxy = settings.market_index_proxies.get(symbol)
            
            snapshot = None
            try:
                snapshot = await self.fetch_quote(symbol)
            except Exception:
                # If primary symbol fails, ignore and try proxy
                pass

            # If main symbol fails (price is 0 or None or exception occurred), try proxy
            if (not snapshot or snapshot.current is None or snapshot.current == 0) and proxy:
                try:
                    snapshot = await self.fetch_quote(proxy)
                except Exception:
                    # If proxy also fails, just skip this index
                    snapshot = None
            
            if snapshot and snapshot.current is not None:
                indices.append({
                    "symbol": symbol,
                    "name": name,
                    "price": snapshot.current,
                    "change": (snapshot.current - (snapshot.previous_close or 0)),
                    "change_percent": snapshot.percent_change or 0.0
                })

        movers = []
        
        async def fetch_with_semaphore(sym):
            async with self._semaphore:
                try:
                    return await self.fetch_quote(sym)
                except Exception:
                    return None

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
