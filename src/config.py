from functools import lru_cache
from typing import Dict, List, Optional

from pydantic import Field, HttpUrl
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables or .env."""

    app_name: str = "Stock News Service"
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@db:5432/stockapp"
    )
    finnhub_api_key: Optional[str] = None
    finnhub_api_base_url: HttpUrl = Field(
        default="https://finnhub.io/api/v1/company-news"
    )
    finnhub_symbol_url: HttpUrl = Field(
        default="https://finnhub.io/api/v1/stock/symbol"
    )
    finnhub_quote_url: HttpUrl = Field(default="https://finnhub.io/api/v1/quote")
    finnhub_symbol_exchange: str = Field(default="US")
    fetch_interval_seconds: int = Field(default=60, ge=15)
    fetch_daily_hour: Optional[int] = Field(default=9, ge=0, le=23)
    fetch_timezone: str = Field(default="Asia/Seoul")
    initial_fetch_on_startup: bool = True
    max_articles_per_symbol: int = Field(default=50, ge=1)
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"])
    llm_api_key: Optional[str] = Field(default=None)
    llm_model: str = Field(default="gpt-4o-mini")
    llm_base_url: Optional[HttpUrl] = Field(default="https://api.openai.com/v1")
    llm_provider: str = Field(default="openai")
    report_article_lookback_days: int = Field(default=3, ge=1, le=14)
    market_indices: List[str] = Field(
        default_factory=lambda: ["^IXIC", "^GSPC"]
    )
    market_index_names: Dict[str, str] = Field(
        default_factory=lambda: {"^IXIC": "Nasdaq", "^GSPC": "S&P 500"}
    )
    market_index_proxies: Dict[str, str] = Field(
        default_factory=lambda: {"^IXIC": "QQQ", "^GSPC": "SPY"}
    )

    model_config = {
        "env_file": ".env",
        "env_nested_delimiter": "__",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
