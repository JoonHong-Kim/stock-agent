from datetime import datetime
from enum import Enum
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


from .market import MarketIndex, MarketSummaryOut, TopMover

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


class ReportType(str, Enum):
    """Report types - smart_briefing is the new unified type, others are legacy"""
    SMART_BRIEFING = "smart_briefing"
    # Legacy types for backward compatibility with existing DB records
    MORNING_BRIEFING = "morning_briefing"
    SENTIMENT_ACTION = "sentiment_action"
    DEEP_DIVE = "deep_dive"


class ReportCreate(BaseModel):
    symbol: str = Field(..., examples=["AAPL"])
    type: ReportType = Field(default=ReportType.SMART_BRIEFING)
    limit: int = Field(default=20, ge=5, le=100)


class ReportOut(BaseModel):
    id: int
    symbol: str
    type: ReportType
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
