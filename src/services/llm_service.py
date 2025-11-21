from __future__ import annotations

import logging
from typing import Optional

from openai import AsyncOpenAI
from openai import OpenAIError


logger = logging.getLogger(__name__)


class LLMServiceError(RuntimeError):
    """Raised when the LLM provider fails or is not configured."""


class LLMService:
    """Thin wrapper around the OpenAI client with sane defaults."""

    def __init__(
        self,
        api_key: Optional[str],
        base_url: Optional[str],
        model: str,
    ) -> None:
        self._model = model
        self._client: Optional[AsyncOpenAI] = None
        if api_key:
            kwargs = {"api_key": api_key}
            if base_url:
                kwargs["base_url"] = base_url
            self._client = AsyncOpenAI(**kwargs)

    @property
    def enabled(self) -> bool:
        return self._client is not None

    async def complete(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 800,
    ) -> str:
        if not self._client:
            raise LLMServiceError("LLM client is not configured.")

        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                temperature=temperature,
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
        except OpenAIError as exc:  # pragma: no cover - network side effect
            logger.error("LLM completion failed: %s", exc)
            raise LLMServiceError("LLM provider rejected the request.") from exc

        if not response.choices:
            raise LLMServiceError("LLM response did not include any choices.")

        message = response.choices[0].message
        if not message or not message.content:
            raise LLMServiceError("LLM response did not include content.")
        return message.content.strip()
