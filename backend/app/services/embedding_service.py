from __future__ import annotations

import json
import logging

from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
        )
    return _client


def generate_embedding(text: str) -> list[float]:
    client = _get_client()
    resp = client.embeddings.create(input=text, model="openai/text-embedding-3-small")
    return resp.data[0].embedding


def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    client = _get_client()
    resp = client.embeddings.create(input=texts, model="openai/text-embedding-3-small")
    sorted_by_index = sorted(resp.data, key=lambda x: x.index)
    return [e.embedding for e in sorted_by_index]
