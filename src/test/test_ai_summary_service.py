import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime

from src.services.reports import AISummaryService
from src.schemas import ReportType

@pytest.mark.asyncio
async def test_generate_report_smart_briefing():
    # Mock dependencies
    mock_session_factory = MagicMock()
    mock_session = AsyncMock()
    mock_session_factory.return_value.__aenter__.return_value = mock_session
    
    mock_llm = AsyncMock()
    mock_llm.complete.return_value = '{"summary": ["A", "B", "C"], "sentiment_score": 80, "sentiment_reason": "Good", "key_risks": ["None"], "market_outlook": "Up"}'
    
    mock_price_service = AsyncMock()
    mock_price_service.fetch_quote.return_value = MagicMock(
        current=100.0, previous_close=90.0, open_price=95.0, percent_change=10.0
    )

    service = AISummaryService(mock_session_factory, mock_llm, mock_price_service)
    
    # Mock internal methods
    service._ensure_symbol_is_watched = AsyncMock()
    service._fetch_recent_articles = AsyncMock()
    service._fetch_recent_articles.return_value = [
        MagicMock(id=1, headline="Test Article", summary="Summary", published_at=datetime.now(), source="Test", url="http://test.com")
    ]

    # Mock session.refresh to populate id and created_at
    async def mock_refresh(instance):
        instance.id = 1
        instance.created_at = datetime.now()
    
    mock_session.refresh.side_effect = mock_refresh
    mock_session.add = MagicMock() # session.add is sync

    report = await service.generate_report("AAPL")

    assert report.symbol == "AAPL"
    assert report.type == ReportType.SMART_BRIEFING
    assert "summary" in report.content
    assert "sentiment_score" in report.content
