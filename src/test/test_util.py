from src.util import normalize_symbol, parse_symbols


def test_normalize_symbol():
    assert normalize_symbol(" aapl ") == "AAPL"


def test_parse_symbols_removes_duplicates():
    assert parse_symbols("aapl, AAPL, msft") == ["AAPL", "MSFT"]
