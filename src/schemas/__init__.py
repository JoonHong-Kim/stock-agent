from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, HttpUrl


class SymbolBase(BaseModel):
    symbol: str = Field(..., examples=["AAPL"])


class SymbolCreate(SymbolBase):
    pass


class SymbolOut(SymbolBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class WatchlistRequest(BaseModel):
    symbols: List[str]


class RefreshRequest(BaseModel):
    symbols: Optional[List[str]] = None


class TickerOut(BaseModel):
    symbol: str
    name: Optional[str] = None
    exchange: Optional[str] = None
    mic: Optional[str] = None
    currency: Optional[str] = None
    type: Optional[str] = None

    model_config = {"from_attributes": True}


class TickerSyncResult(BaseModel):
    total: int
    inserted_or_updated: int


class BodyBackfillResult(BaseModel):
    processed: int
    updated: int


class ArticleOut(BaseModel):
    id: int
    symbol: str
    headline: str
    url: HttpUrl
    summary: Optional[str] = None
    source: Optional[str] = None
    published_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class NewsPayload(BaseModel):
    symbol: str
    articles: List[ArticleOut]
