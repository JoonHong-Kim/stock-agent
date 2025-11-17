from functools import lru_cache
from typing import List, Optional

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
    finnhub_symbol_exchange: str = Field(default="US")
    fetch_interval_seconds: int = Field(default=60, ge=15)
    fetch_daily_hour: Optional[int] = Field(default=9, ge=0, le=23)
    fetch_timezone: str = Field(default="Asia/Seoul")
    initial_fetch_on_startup: bool = True
    max_articles_per_symbol: int = Field(default=50, ge=1)
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"])

    model_config = {
        "env_file": ".env",
        "env_nested_delimiter": "__",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
