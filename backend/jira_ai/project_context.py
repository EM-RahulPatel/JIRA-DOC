"""Project context helpers copied from the Node service."""

from __future__ import annotations

import asyncio
import os
from typing import Any, Dict, List, Optional

from .embedding import get_embedding_vector
from .projects_store import ensure_project, get_project, list_projects, patch_project
from .vector_store import list_recent_chunks, query_embeddings

DEFAULT_PROJECT_KEY = os.getenv("DEFAULT_PROJECT_KEY", "SCRUM")


async def _list_projects() -> List[Dict[str, Any]]:
    return await asyncio.to_thread(list_projects)


async def _ensure_project(key: str, defaults: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return await asyncio.to_thread(ensure_project, key, defaults or {})


async def _get_project(key: str) -> Optional[Dict[str, Any]]:
    return await asyncio.to_thread(get_project, key)


async def _patch_project(key: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    return await asyncio.to_thread(patch_project, key, updates)


async def get_all_projects() -> List[Dict[str, Any]]:
    projects = await _list_projects()
    if projects:
        return projects
    seeded = await _ensure_project(DEFAULT_PROJECT_KEY, {"name": DEFAULT_PROJECT_KEY})
    return [seeded]


async def get_project_context(project_key: Optional[str]) -> Dict[str, Any]:
    if not project_key:
        return await _ensure_project(DEFAULT_PROJECT_KEY, {"name": DEFAULT_PROJECT_KEY})
    project = await _get_project(project_key)
    if project:
        return project
    return await _ensure_project(project_key, {"name": project_key})


async def update_project_metadata(project_key: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    if not project_key:
        raise ValueError("project_key is required")
    return await _patch_project(project_key, updates)


async def build_context_preview(project_key: str, query_text: Optional[str]) -> Dict[str, Any]:
    project = await get_project_context(project_key)
    rag_config = project.get("ragConfig") or {}
    top_k = int(rag_config.get("topK") or 5)
    embedding = await get_embedding_vector(query_text or "") if query_text else None
    if embedding:
        rag_chunks = await asyncio.to_thread(query_embeddings, project["key"], embedding, top_k)
    else:
        rag_chunks = await asyncio.to_thread(list_recent_chunks, project["key"], top_k)
    return {
        "project": project,
        "ragConfig": rag_config,
        "ragChunks": rag_chunks,
    }


__all__ = [
    "get_all_projects",
    "get_project_context",
    "update_project_metadata",
    "build_context_preview",
]
