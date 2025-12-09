"""File-based storage for Jira project metadata."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
PROJECTS_FILE = DATA_DIR / "projects.json"

DEFAULT_RAG_CONFIG = {
    "chunkSize": 1000,
    "chunkOverlap": 200,
    "topK": 5,
}

DEFAULT_MAPPING = {
    "defaultAssignees": {},
    "labelAliases": {},
    "componentAliases": {},
}


def _ensure_data_file() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not PROJECTS_FILE.exists():
        PROJECTS_FILE.write_text("[]\n", encoding="utf-8")


def _read_projects() -> List[Dict[str, Any]]:
    _ensure_data_file()
    raw = PROJECTS_FILE.read_text(encoding="utf-8").strip()
    if not raw:
        return []
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return []


def _write_projects(projects: List[Dict[str, Any]]) -> None:
    _ensure_data_file()
    PROJECTS_FILE.write_text(json.dumps(projects, indent=2) + "\n", encoding="utf-8")


def _to_key(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    normalized = value.strip().upper()
    cleaned = "".join(ch for ch in normalized if ch.isalnum())
    return cleaned or None


def _with_defaults(project: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not project:
        return None
    return {
        "name": project.get("name") or project.get("key"),
        "description": project.get("description", ""),
        "mapping": {**DEFAULT_MAPPING, **project.get("mapping", {})},
        "templates": project.get("templates") or {},
        "ragConfig": {**DEFAULT_RAG_CONFIG, **project.get("ragConfig", {})},
        "metadata": project.get("metadata") or {},
        "lastOnboardedAt": project.get("lastOnboardedAt"),
        **project,
    }


def list_projects() -> List[Dict[str, Any]]:
    return [_with_defaults(item) for item in _read_projects() if item]


def get_project(key: str) -> Optional[Dict[str, Any]]:
    normalized = _to_key(key)
    if not normalized:
        return None
    for item in _read_projects():
        if _to_key(item.get("key")) == normalized:
            return _with_defaults(item)
    return None


def upsert_project(project: Dict[str, Any]) -> Dict[str, Any]:
    if not project or not project.get("key"):
        raise ValueError("Project key is required")
    normalized = _to_key(project["key"])
    if not normalized:
        raise ValueError("Invalid project key")

    records = _read_projects()
    updated = {**project, "key": normalized}
    existing_index = next((idx for idx, item in enumerate(records) if _to_key(item.get("key")) == normalized), -1)
    if existing_index >= 0:
        records[existing_index] = {**records[existing_index], **updated}
    else:
        records.append(updated)

    _write_projects(records)
    return _with_defaults(updated)  # type: ignore[arg-type]


def patch_project(key: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    existing = get_project(key)
    if not existing:
        return upsert_project({"key": key, **updates})
    merged = {**existing, **updates, "key": existing["key"]}
    return upsert_project(merged)


def ensure_project(key: str, defaults: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    existing = get_project(key)
    if existing:
        return existing
    defaults = defaults or {}
    return upsert_project({"key": key, **defaults})


def touch_project(key: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    metadata = metadata or {}
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "metadata": metadata,
        "lastOnboardedAt": metadata.get("lastOnboardedAt") or now,
    }
    return patch_project(key, payload)


__all__ = [
    "list_projects",
    "get_project",
    "ensure_project",
    "patch_project",
    "upsert_project",
    "touch_project",
]
