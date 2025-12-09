"""Text helpers shared by Jira automation services."""

from __future__ import annotations

import re
from typing import List

_whitespace_re = re.compile(r"\s+")


def normalize_whitespace(value: str | None) -> str:
    if not value or not isinstance(value, str):
        return ""
    return _whitespace_re.sub(" ", value).strip()


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    if not text:
        return []
    clean = text.replace("\r\n", "\n")
    chunks: List[str] = []
    index = 0
    while index < len(clean):
        chunk = clean[index : index + chunk_size]
        chunks.append(chunk)
        if len(chunk) < chunk_size:
            break
        index += max(chunk_size - overlap, 1)
    return chunks


__all__ = ["normalize_whitespace", "chunk_text"]
