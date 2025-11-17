from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import contextlib
from typing import Iterable, List, Optional, Sequence, Set

from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ..config import get_settings
from ..db.models import Article, WatchedSymbol
from ..schemas import ArticleOut
from ..util import normalize_symbol


settings = get_settings()


class ConnectionManager:
    """Tracks WebSocket subscribers per ticker symbol."""

    def __init__(self) -> None:
        self._symbol_map: dict[str, Set[WebSocket]] = {}
        self._client_symbols: dict[WebSocket, Set[str]] = {}
        self._lock = asyncio.Lock()

    async def register(self, websocket: WebSocket) -> None:
        await websocket.accept()

    async def subscribe(self, websocket: WebSocket, symbols: Iterable[str]) -> None:
        normalized = {normalize_symbol(symbol) for symbol in symbols if symbol}
        async with self._lock:
            current = self._client_symbols.get(websocket, set())
            to_remove = current - normalized
            to_add = normalized - current

            for symbol in to_remove:
                self._symbol_map.get(symbol, set()).discard(websocket)
            for symbol in to_add:
                self._symbol_map.setdefault(symbol, set()).add(websocket)

            self._client_symbols[websocket] = normalized

    async def disconnect(self, websocket: WebSocket, *, close: bool = True) -> None:
        async with self._lock:
            symbols = self._client_symbols.pop(websocket, set())
            for symbol in symbols:
                sockets = self._symbol_map.get(symbol)
                if sockets:
                    sockets.discard(websocket)
                    if not sockets:
                        self._symbol_map.pop(symbol, None)
        if close:
            with contextlib.suppress(RuntimeError):
                await websocket.close()

    async def push(self, symbol: str, articles: Sequence[ArticleOut]) -> None:
        if not articles:
            return
        message = {
            "symbol": normalize_symbol(symbol),
            "articles": jsonable_encoder([article for article in articles]),
        }
        async with self._lock:
            listeners = list(self._symbol_map.get(normalize_symbol(symbol), set()))
        for socket in listeners:
            try:
                await socket.send_json(message)
            except RuntimeError:
                await self.disconnect(socket, close=False)


class NewsDispatcher:
    """Coordinates polling and broadcasting for watched symbols."""

    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        fetcher,
        connection_manager: ConnectionManager,
        body_fetcher,
    ) -> None:
        self._sessions = session_factory
        self._fetcher = fetcher
        self._connections = connection_manager
        self._body_fetcher = body_fetcher

    async def broadcast_latest(
        self, symbols: Optional[Sequence[str]] = None
    ) -> List[ArticleOut]:
        normalized = (
            {normalize_symbol(symbol) for symbol in symbols or [] if symbol}
            if symbols
            else None
        )
        async with self._sessions() as session:
            query = select(WatchedSymbol)
            if normalized:
                query = query.where(WatchedSymbol.symbol.in_(normalized))
            result = await session.execute(query)
            symbols = result.scalars().all()
            collected: List[ArticleOut] = []
            for symbol in symbols:
                payloads = await self._process_symbol(session, symbol)
                collected.extend(payloads)
            return collected

    async def _process_symbol(
        self, session: AsyncSession, watched: WatchedSymbol
    ) -> List[ArticleOut]:
        articles = await self._fetcher.fetch(
            watched.symbol,
            watched.last_fetched_at,
            limit=5,
        )
        if not articles:
            return []

        now = datetime.now(timezone.utc)
        insert_stmt = (
            insert(Article)
            .values(
                [
                    {
                        "symbol": item["symbol"],
                        "headline": item["headline"],
                        "summary": item.get("summary"),
                        "url": item["url"],
                        "source": item.get("source"),
                        "external_id": item.get("external_id") or item["url"],
                        "published_at": item.get("published_at"),
                    }
                    for item in articles
                ]
            )
            .on_conflict_do_nothing(
                index_elements=[Article.symbol, Article.external_id]
            )
            .returning(
                Article.id,
                Article.symbol,
                Article.headline,
                Article.url,
                Article.summary,
                Article.source,
                Article.published_at,
            )
        )

        result = await session.execute(insert_stmt)
        inserted = result.mappings().all()

        if inserted:
            await session.execute(
                update(WatchedSymbol)
                .where(WatchedSymbol.id == watched.id)
                .values(last_fetched_at=now)
            )
            await session.commit()

            payloads: List[ArticleOut] = [
                ArticleOut(
                    id=row["id"],
                    symbol=row["symbol"],
                    headline=row["headline"],
                    url=row["url"],
                    summary=row["summary"],
                    source=row["source"],
                    published_at=row["published_at"],
                )
                for row in inserted
            ]
            await self._connections.push(watched.symbol, payloads)
            await self._populate_article_bodies(session, payloads)
            return payloads

        return []

    async def _populate_article_bodies(
        self, session: AsyncSession, payloads: List[ArticleOut]
    ) -> None:
        if not self._body_fetcher:
            return
        updated = False
        for item in payloads:
            body = await self._body_fetcher.fetch(item.url)
            if body:
                await session.execute(
                    update(Article).where(Article.id == item.id).values(body=body)
                )
                updated = True
        if updated:
            await session.commit()
