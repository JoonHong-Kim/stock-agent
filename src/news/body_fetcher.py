from __future__ import annotations

import asyncio
from typing import Optional

from playwright.async_api import Browser, Page, async_playwright


class ArticleBodyFetcher:
    """Fetches raw article body text via Playwright."""

    def __init__(self) -> None:
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        if self._browser:
            return
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=True)

    async def stop(self) -> None:
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        self._browser = None
        self._playwright = None

    async def fetch(self, url: str) -> Optional[str]:
        if not url:
            return None
        async with self._lock:
            if not self._browser:
                await self.start()
        assert self._browser is not None
        page: Page = await self._browser.new_page()
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            content = await page.inner_text("body")
            return content.strip()
        except Exception:
            return None
        finally:
            await page.close()
