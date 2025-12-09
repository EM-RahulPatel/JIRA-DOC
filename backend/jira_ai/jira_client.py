"""Async Jira REST client."""

from __future__ import annotations

import asyncio
import base64
import os
from typing import Any, Dict, Optional

import httpx

JIRA_BASE = os.getenv("JIRA_BASE")
JIRA_EMAIL = os.getenv("JIRA_EMAIL")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN")
DEFAULT_TIMEOUT = float(os.getenv("JIRA_TIMEOUT_SECONDS") or 20)
MAX_BACKOFF = 10.0

_auth_header: Optional[str] = None
if JIRA_EMAIL and JIRA_API_TOKEN:
    encoded = base64.b64encode(f"{JIRA_EMAIL}:{JIRA_API_TOKEN}".encode("utf-8")).decode("ascii")
    _auth_header = f"Basic {encoded}"


def is_configured() -> bool:
    return bool(JIRA_BASE and _auth_header)


async def jira_request(
    path: str,
    method: str = "GET",
    body: Optional[Dict[str, Any]] = None,
    *,
    retries: int = 3,
    timeout: float = DEFAULT_TIMEOUT,
) -> Any:
    if not is_configured():
        raise RuntimeError("Jira credentials are not configured")

    if not path.startswith("/"):
        path = "/" + path
    url = f"{JIRA_BASE}{path}"
    headers = {
        "Authorization": _auth_header,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    last_error: Optional[Exception] = None

    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(retries + 1):
            try:
                response = await client.request(method, url, json=body, headers=headers)
                if response.status_code == 429:
                    retry_after = float(response.headers.get("Retry-After", "3"))
                    await asyncio.sleep(min(max(retry_after, 1.0), MAX_BACKOFF))
                    continue
                response.raise_for_status()
                if response.content:
                    try:
                        return response.json()
                    except ValueError:
                        return None
                return None
            except httpx.HTTPStatusError as exc:  # pragma: no cover - varies by response
                error_text = exc.response.text if exc.response is not None else str(exc)
                last_error = RuntimeError(
                    f"Jira error {exc.response.status_code if exc.response else ''}: {error_text}"
                )
                if 400 <= exc.response.status_code < 500:
                    break
            except Exception as exc:  # pragma: no cover - network variability
                last_error = exc
                if attempt >= retries:
                    break
                await asyncio.sleep(min(2 ** attempt, MAX_BACKOFF))

    if last_error:
        raise last_error
    raise RuntimeError("Unknown Jira request failure")


__all__ = ["jira_request", "is_configured"]
