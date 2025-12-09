"""Embedding helper utilities for Jira automation."""

from __future__ import annotations

import asyncio
import hashlib
import math
import os
from typing import List

import google.generativeai as genai

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL") or os.getenv("GEMINI_EMBED_MODEL") or "text-embedding-004"
EMBEDDING_DIMENSIONS = int(os.getenv("EMBEDDING_DIMENSIONS") or 256)
_API_KEY = (
    os.getenv("GEMINI_API_KEY")
    or os.getenv("GOOGLE_API_KEY")
    or os.getenv("OPENAI_API_KEY")
    or os.getenv("EMBEDDING_API_KEY")
)

_embed_model = None
if _API_KEY:
    try:
        genai.configure(api_key=_API_KEY)
        _embed_model = genai.GenerativeModel(model_name=EMBEDDING_MODEL)
    except Exception as exc:  # pragma: no cover - best effort initialization
        print(f"[Embedding] Failed to initialize remote embedding model: {exc}")


def _fallback_embedding(text: str) -> List[float]:
    if not text:
        text = "empty"
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    vector = [0.0] * EMBEDDING_DIMENSIONS
    for idx, char in enumerate(text):
        char_code = ord(char)
        slot = (digest[idx % len(digest)] + char_code) % EMBEDDING_DIMENSIONS
        vector[slot] += (char_code % 32) / 32.0
    magnitude = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / magnitude for value in vector]


async def get_embedding_vector(text: str) -> List[float]:
    payload = text.strip() or "empty"
    if not _embed_model:
        return _fallback_embedding(payload)
    try:
        response = await asyncio.to_thread(_embed_model.embed_content, payload)
        values = getattr(getattr(response, "embedding", None), "values", None)
        if isinstance(values, list) and values:
            return [float(v) for v in values]
    except Exception as exc:  # pragma: no cover - remote errors fallback
        print(f"[Embedding] Falling back due to API error: {exc}")
    return _fallback_embedding(payload)


__all__ = ["get_embedding_vector"]
