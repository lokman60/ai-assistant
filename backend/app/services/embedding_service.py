from __future__ import annotations

import json
import logging

from sentence_transformers import SentenceTransformer

from app.core.config import settings

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading embedding model: %s", settings.embedding_model)
        _model = SentenceTransformer(settings.embedding_model)
    return _model


def generate_embedding(text: str) -> list[float]:
    model = _get_model()
    emb = model.encode(text, normalize_embeddings=True)
    return emb.tolist()


def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    model = _get_model()
    embs = model.encode(texts, normalize_embeddings=True)
    return [e.tolist() for e in embs]
