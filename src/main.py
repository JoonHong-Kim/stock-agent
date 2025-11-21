from __future__ import annotations

import logging
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db.session import SessionLocal, init_db
from .streaming.dispatcher import ConnectionManager, NewsDispatcher
from .news.fetcher import NewsFetcher, NewsStreamLoop, ArticleBodyFetcher
from .services.tickers import sync_tickers_from_finnhub
from .api.routes import router
from .util import parse_symbols
from .services.llm_service import LLMService
from .services.price_service import PriceService
from .services.reports import AISummaryService


settings = get_settings()
logger = logging.getLogger("stockagent")

app = FastAPI(title=settings.app_name)
app.include_router(router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

connection_manager = ConnectionManager()
news_fetcher = NewsFetcher()
article_body_fetcher = ArticleBodyFetcher()
dispatcher = NewsDispatcher(
    SessionLocal, news_fetcher, connection_manager, article_body_fetcher
)
stream_loop = NewsStreamLoop(news_fetcher, dispatcher)
app.state.dispatcher = dispatcher
app.state.body_fetcher = article_body_fetcher
llm_base_url = str(settings.llm_base_url) if settings.llm_base_url else None
llm_service = LLMService(settings.llm_api_key, llm_base_url, settings.llm_model)
price_service = PriceService()
ai_summary_service = AISummaryService(SessionLocal, llm_service, price_service)
app.state.ai_summary_service = ai_summary_service


@app.on_event("startup")
async def startup_event() -> None:
    await init_db()
    if settings.finnhub_api_key:
        async with SessionLocal() as session:
            try:
                result = await sync_tickers_from_finnhub(session)
                if result.inserted_or_updated:
                    logger.info(
                        "Synced %s tickers (payload %s)",
                        result.inserted_or_updated,
                        result.total,
                    )
            except Exception as exc:  # pragma: no cover
                logger.warning("Ticker sync failed: %s", exc)
    else:
        logger.warning("FINNHUB_API_KEY missing; ticker sync skipped.")
    await article_body_fetcher.start()
    await stream_loop.start()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await stream_loop.stop()
    await article_body_fetcher.stop()


@app.websocket("/ws/news")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await connection_manager.register(websocket)
    initial_symbols = parse_symbols(websocket.query_params.get("symbols"))
    if initial_symbols:
        await connection_manager.subscribe(websocket, initial_symbols)
    try:
        while True:
            message = await websocket.receive_json()
            symbols = message.get("symbols")
            if symbols:
                await connection_manager.subscribe(websocket, symbols)
                await websocket.send_json({"ack": list(symbols)})
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket)
