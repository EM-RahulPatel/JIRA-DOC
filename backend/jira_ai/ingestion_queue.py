"""Inline ingestion queue replacement for BullMQ."""

from __future__ import annotations

from .ingestion_service import process_document_ingestion


def is_queue_enabled() -> bool:
    return False


async def enqueue_document(job_payload: dict) -> dict:
    required = {"projectKey", "docId", "text"}
    missing = [field for field in required if not job_payload.get(field)]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")
    return await process_document_ingestion(
        project_key=job_payload["projectKey"],
        doc_id=job_payload["docId"],
        text=job_payload["text"],
        chunk_size=job_payload.get("chunkSize"),
        chunk_overlap=job_payload.get("chunkOverlap"),
        metadata=job_payload.get("metadata"),
    )


__all__ = ["enqueue_document"]
