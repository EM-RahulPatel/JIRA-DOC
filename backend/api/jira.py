"""Jira automation endpoints migrated from the Node service."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from jira_ai.jira_client import is_configured, jira_request
from jira_ai.project_context import build_context_preview, get_all_projects

router = APIRouter(prefix="/projects", tags=["projects"])


def _format_remote_projects(payload: Any) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    if isinstance(payload, dict) and "values" in payload:
        candidate = payload.get("values")
    elif isinstance(payload, list):
        candidate = payload
    else:
        candidate = []

    for project in candidate or []:
        if not isinstance(project, dict):
            continue
        key = (project.get("key") or "").strip()
        if not key:
            continue
        items.append(
            {
                "key": key,
                "name": project.get("name") or key,
                "id": project.get("id"),
                "description": project.get("description") or "",
                "projectTypeKey": project.get("projectTypeKey"),
                "simplified": project.get("simplified"),
                "avatarUrls": project.get("avatarUrls") or {},
            }
        )
    return items


@router.get("/")
async def list_projects():
    if is_configured():
        try:
            remote_projects = await jira_request("/rest/api/3/project")
            formatted = _format_remote_projects(remote_projects)
            if formatted:
                return {"projects": formatted}
        except Exception as exc:  # pragma: no cover - network variability
            raise HTTPException(status_code=502, detail=f"Failed to read Jira projects: {exc}") from exc

    projects = await get_all_projects()
    return {"projects": projects}


@router.get("/{project_key}/context-preview")
async def context_preview(project_key: str, q: Optional[str] = Query(default=None, alias="q")):
	if not project_key:
		raise HTTPException(status_code=400, detail="Project key is required")
	preview = await build_context_preview(project_key, q)
	return preview


__all__ = ["router"]
