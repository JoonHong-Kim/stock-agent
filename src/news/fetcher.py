from __future__ import annotations

import asyncio
import contextlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from ..config import get_settings


settings = get_settings()


class NewsFetcher:
    """Fetches stock-related news from a third-party API."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=15)

    async def fetch(
        self, symbol: str, since: Optional[datetime] = None, limit: int = 10
    ) -> List[Dict[str, Any]]:
        if not settings.finnhub_api_key:
            return self._mock_payload(symbol, limit)

        now = datetime.now(timezone.utc)
        start = (
            since.astimezone(timezone.utc)
            if since
            else now - timedelta(days=3)
        )
        params: Dict[str, Any] = {
            "symbol": symbol.upper(),
            "from": start.date().isoformat(),
            "to": now.date().isoformat(),
            "token": settings.finnhub_api_key,
        }

        response = await self._client.get(
            str(settings.finnhub_api_base_url),
            params=params,
        )
        response.raise_for_status()
        data = response.json()
        articles = []
        for item in data:
            if not item.get("url"):
                continue
            published_at = self._parse_timestamp(item.get("datetime"))
            if since and published_at and published_at <= since:
                continue
            articles.append(
                {
                    "symbol": symbol.upper(),
                    "headline": item.get("headline", "Untitled"),
                    "summary": item.get("summary"),
                    "url": item.get("url"),
                    "source": item.get("source"),
                    "published_at": published_at,
                    "external_id": str(item.get("id") or item.get("url")),
                }
            )
        return articles[:limit]

    async def close(self) -> None:
        await self._client.aclose()

    def _mock_payload(self, symbol: str, limit: int) -> List[Dict[str, Any]]:
        now = datetime.now(timezone.utc)
        articles = []
        for i in range(limit):
            articles.append(
                {
                    "symbol": symbol.upper(),
                    "headline": f"{symbol.upper()} update {i + 1}",
                    "summary": "Demo data because FINNHUB_API_KEY is not configured.",
                    "url": f"https://example.com/{symbol.lower()}/{i}",
                    "source": "MockWire",
                    "published_at": now,
                    "external_id": f"{symbol}-{i}",
                }
            )
        return articles

    @staticmethod
    def _parse_timestamp(value: Optional[int]) -> Optional[datetime]:
        if value is None:
            return None
        return datetime.fromtimestamp(value, tz=timezone.utc)


class NewsStreamLoop:
    """Background task that polls for news and notifies observers."""

    def __init__(self, fetcher: NewsFetcher, dispatcher: "NewsDispatcher") -> None:
        self.fetcher = fetcher
        self.dispatcher = dispatcher
        self._task: Optional[asyncio.Task[None]] = None
        self._running = False
        self._timezone = self._resolve_timezone(settings.fetch_timezone)

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._poll_loop())

    async def stop(self) -> None:
        if not self._running:
            return
        self._running = False
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
        await self.fetcher.close()

    async def _poll_loop(self) -> None:
        if settings.initial_fetch_on_startup:
            await self.dispatcher.broadcast_latest()

        while self._running:
            wait_seconds = self._seconds_until_next_run()
            await asyncio.sleep(wait_seconds)
            if not self._running:
                break
            await self.dispatcher.broadcast_latest()

    def _seconds_until_next_run(self) -> float:
        if settings.fetch_daily_hour is None:
            return float(settings.fetch_interval_seconds)

        now = datetime.now(self._timezone)
        target = now.replace(
            hour=settings.fetch_daily_hour, minute=0, second=0, microsecond=0
        )
        if now >= target:
            target += timedelta(days=1)
        delta = target - now
        return max(delta.total_seconds(), 0.0)

    @staticmethod
    def _resolve_timezone(name: str) -> ZoneInfo:
        try:
            return ZoneInfo(name)
        except ZoneInfoNotFoundError:
            return ZoneInfo("UTC")
