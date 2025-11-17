from __future__ import annotations

from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db.session import SessionLocal, init_db
from .streaming.dispatcher import ConnectionManager, NewsDispatcher
from .news.fetcher import NewsFetcher, NewsStreamLoop
from .news.body_fetcher import ArticleBodyFetcher
from .api.routes import router
from .util import parse_symbols


settings = get_settings()

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


@app.on_event("startup")
async def startup_event() -> None:
    await init_db()
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
