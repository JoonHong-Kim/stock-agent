from typing import List
from pydantic import BaseModel

class MarketIndex(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float

class TopMover(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float

class MarketSummaryOut(BaseModel):
    indices: List[MarketIndex]
    top_gainers: List[TopMover]
    top_losers: List[TopMover]
