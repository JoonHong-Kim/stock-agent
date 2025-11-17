from __future__ import annotations

import os
from typing import Optional


def get_secret(key: str, default: Optional[str] = None) -> Optional[str]:
    """Centralized place to fetch secrets (env or secret manager later)."""
    return os.getenv(key, default)
