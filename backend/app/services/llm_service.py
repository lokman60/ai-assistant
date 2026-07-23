from __future__ import annotations

import logging

from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        logger.info("Creating OpenAI client for %s", settings.openrouter_base_url)
        _client = OpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            timeout=settings.llm_timeout,
        )
    return _client


def call_llm(messages: list[dict]) -> str:
    client = _get_client()
    logger.info("Calling model %s with %d messages", settings.openrouter_model, len(messages))
    response = client.chat.completions.create(
        model=settings.openrouter_model,
        messages=messages,
    )
    return response.choices[0].message.content
