"""Vector store backed by JSON files per project."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parent.parent
VECTOR_DIR = BASE_DIR / "data" / "vector-store"


def _ensure_dir() -> None:
    VECTOR_DIR.mkdir(parents=True, exist_ok=True)


def _file_for_project(project_key: str) -> Path:
    safe = "".join(ch if ch.isalnum() else "_" for ch in project_key.upper())
    return VECTOR_DIR / f"{safe}.json"


def _read_vectors(project_key: str) -> List[Dict[str, Any]]:
    _ensure_dir()
    file_path = _file_for_project(project_key)
    if not file_path.exists():
        return []
    try:
        raw = file_path.read_text(encoding="utf-8")
        return json.loads(raw) if raw.strip() else []
    except json.JSONDecodeError:
        return []


def _write_vectors(project_key: str, entries: List[Dict[str, Any]]) -> None:
    _ensure_dir()
    file_path = _file_for_project(project_key)
    file_path.write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")


def _cosine_similarity(vector_a: List[float], vector_b: List[float]) -> float:
    if not vector_a or not vector_b:
        return 0.0
    length = min(len(vector_a), len(vector_b))
    dot = sum(vector_a[i] * vector_b[i] for i in range(length))
    mag_a = sum(vector_a[i] * vector_a[i] for i in range(length)) ** 0.5 or 1.0
    mag_b = sum(vector_b[i] * vector_b[i] for i in range(length)) ** 0.5 or 1.0
    return dot / (mag_a * mag_b)


def upsert_embeddings(project_key: str, entries: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not project_key:
        raise ValueError("project_key required")
    if not entries:
        return {"count": 0}
    existing = _read_vectors(project_key)
    records = {entry.get("id"): entry for entry in existing if entry.get("id")}
    for entry in entries:
        entry_id = entry.get("id")
        if not entry_id:
            continue
        normalized = {
            **entry,
            "vector": list(entry.get("vector") or []),
            "metadata": {**(entry.get("metadata") or {})},
        }
        if not normalized["metadata"].get("updatedAt"):
            normalized["metadata"]["updatedAt"] = (
                normalized["metadata"].get("createdAt")
                or datetime.now(timezone.utc).isoformat()
            )
        records[entry_id] = normalized
    next_entries = list(records.values())
    _write_vectors(project_key, next_entries)
    return {"count": len(entries)}


def remove_embeddings_by_doc(project_key: str, doc_id: str) -> Dict[str, Any]:
    if not doc_id:
        return {"removed": 0}
    existing = _read_vectors(project_key)
    filtered = [entry for entry in existing if entry.get("metadata", {}).get("docId") != doc_id]
    _write_vectors(project_key, filtered)
    return {"removed": len(existing) - len(filtered)}


def query_embeddings(project_key: str, vector: List[float] | None, top_k: int = 5) -> List[Dict[str, Any]]:
    if not project_key:
        return []
    entries = _read_vectors(project_key)
    if not entries:
        return []
    if not vector:
        return entries[:top_k]
    scored = []
    for entry in entries:
        score = _cosine_similarity(vector, entry.get("vector") or [])
        scored.append({**entry, "score": score})
    scored.sort(key=lambda item: item.get("score", 0), reverse=True)
    return scored[:top_k]


def list_recent_chunks(project_key: str, limit: int = 5) -> List[Dict[str, Any]]:
    entries = _read_vectors(project_key)
    return sorted(
        entries,
        key=lambda entry: entry.get("metadata", {}).get("updatedAt") or "",
        reverse=True,
    )[:limit]


__all__ = [
    "upsert_embeddings",
    "remove_embeddings_by_doc",
    "query_embeddings",
    "list_recent_chunks",
]
