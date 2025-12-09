"""Document ingestion helpers (chunking + embedding)."""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone

from .embedding import get_embedding_vector
from .text_utils import chunk_text, normalize_whitespace
from .vector_store import remove_embeddings_by_doc, upsert_embeddings

MAX_BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE") or 50)
DEFAULT_CHUNK_SIZE = int(os.getenv("EMBED_CHUNK_SIZE") or 1000)
DEFAULT_CHUNK_OVERLAP = int(os.getenv("EMBED_CHUNK_OVERLAP") or 200)


async def process_document_ingestion(
    *,
    project_key: str,
    doc_id: str,
    text: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
    metadata: dict | None = None,
) -> dict:
    if not project_key or not doc_id:
        raise ValueError("project_key and doc_id are required")
    if not text:
        return {"count": 0}

    await asyncio.to_thread(remove_embeddings_by_doc, project_key, doc_id)

    safe_chunk_size = int(chunk_size or DEFAULT_CHUNK_SIZE)
    safe_overlap = int(chunk_overlap or DEFAULT_CHUNK_OVERLAP)
    chunks = chunk_text(text, safe_chunk_size, safe_overlap)
    total = 0
    batch: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()

    for index, raw_chunk in enumerate(chunks):
        chunk = normalize_whitespace(raw_chunk)
        if not chunk:
            continue
        vector = await get_embedding_vector(chunk)
        batch.append(
            {
                "id": f"{doc_id}#{index}",
                "vector": vector,
                "metadata": {
                    "docId": doc_id,
                    "chunkIndex": index,
                    "text": chunk[:2000],
                    "projectKey": project_key,
                    **(metadata or {}),
                    "createdAt": (metadata or {}).get("createdAt") or now,
                },
            }
        )
        if len(batch) >= MAX_BATCH_SIZE:
            await asyncio.to_thread(upsert_embeddings, project_key, batch)
            total += len(batch)
            batch.clear()

    if batch:
        await asyncio.to_thread(upsert_embeddings, project_key, batch)
        total += len(batch)

    return {"count": total}


__all__ = ["process_document_ingestion"]
