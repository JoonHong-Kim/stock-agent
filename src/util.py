from __future__ import annotations

from typing import Iterable, List


def normalize_symbol(symbol: str) -> str:
    """Normalize ticker symbols by stripping whitespace and uppercasing."""
    return symbol.strip().upper()


def parse_symbols(raw: str | None) -> List[str]:
    """Convert comma-separated symbols into a unique, ordered list."""
    if not raw:
        return []
    seen: set[str] = set()
    ordered: List[str] = []
    for token in raw.split(","):
        normalized = normalize_symbol(token)
        if normalized and normalized not in seen:
            seen.add(normalized)
            ordered.append(normalized)
    return ordered


def ensure_list(symbols: Iterable[str]) -> List[str]:
    """Return normalized list from any iterable of symbols."""
    return [normalize_symbol(symbol) for symbol in symbols if symbol]
