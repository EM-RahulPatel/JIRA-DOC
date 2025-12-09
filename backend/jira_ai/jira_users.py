"""User lookup helpers for Jira."""

from __future__ import annotations

from typing import Dict, Optional

from .jira_client import jira_request

_cache: Dict[str, Optional[str]] = {}


def _normalize(value: str | None) -> Optional[str]:
    return value.strip().lower() if isinstance(value, str) else None


async def find_user_account_id(identifier: str | None) -> Optional[str]:
    key = _normalize(identifier)
    if not key:
        return None
    if key in _cache:
        return _cache[key]

    try:
        users = await jira_request(f"/rest/api/3/user/search?query={identifier}")
    except Exception as exc:  # pragma: no cover
        print(f"[JiraUserLookup] lookup failed: {exc}")
        _cache[key] = None
        return None

    if not isinstance(users, list) or not users:
        _cache[key] = None
        return None

    exact = None
    for user in users:
        if _normalize(user.get("accountId")) == key:
            exact = user
            break
        if _normalize(user.get("displayName")) == key:
            exact = user
            break
        if _normalize(user.get("emailAddress")) == key:
            exact = user
            break
        if _normalize(user.get("name")) == key:
            exact = user
            break

    account_id = (exact or users[0]).get("accountId")
    _cache[key] = account_id
    return account_id


__all__ = ["find_user_account_id"]
