"""Issue update helpers ported from the Node service."""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from .jira_client import jira_request
from .jira_helpers import build_adf
from .jira_users import find_user_account_id
from .llm_gateway import generate_json

SUMMARY_KEYWORDS = {
    "rename",
    "retitle",
    "change title",
    "change the title",
    "change summary",
    "change the summary",
    "update title",
    "update the title",
    "update summary",
    "update the summary",
    "set title",
    "set the title",
    "set summary",
    "set the summary",
    "summary",
    "title",
}


def _strip_fences(text: str) -> str:
    return re.sub(r"```json|```", "", text, flags=re.IGNORECASE).strip()


def _normalize_labels(labels: Any) -> List[str]:
    if not isinstance(labels, list):
        return []
    normalized: List[str] = []
    for label in labels:
        if isinstance(label, str):
            clean = label.strip().lower()
            if clean:
                normalized.append(clean)
    return normalized


def _should_allow_summary_update(summary_value: str | None, source_text: str | None) -> bool:
    summary = summary_value.strip() if isinstance(summary_value, str) else ""
    if not summary:
        return False
    source = source_text.strip().lower() if isinstance(source_text, str) else ""
    if not source:
        return True
    if source == summary.lower():
        return False
    return any(keyword in source for keyword in SUMMARY_KEYWORDS)


async def analyze_issue_update(user_text: str) -> Dict[str, Any]:
    if not user_text:
        raise ValueError("text is required")

    prompt = f"""
You are an AI Jira Update Assistant.

Goal: convert the user instructions into a JSON payload describing how to update a Jira issue.

Rules:
- Respond ONLY with raw JSON (no code fences, no prose).
- Do not invent fields.
- Identify the issue key (e.g., SCRUM-5). If missing, set to an empty string.
- Allowed priorities: Highest, High, Medium, Low, Lowest.
- Assignee should be a Jira user name or email; leave empty if unclear.
- Labels must be lowercase strings without spaces; omit invalid labels.
- Never change the summary/title unless the user explicitly says to rename/change/update the summary.
- Do NOT copy the user’s instruction text into the summary.
- For assignment-only or status-only requests, leave summary and description empty.
- For comments, return the exact user message text.

Output schema:
{{
  "issueKey": "",
  "fields": {{
    "summary": "",
    "description": "",
    "priority": "",
    "assignee": "",
    "labels": []
  }},
  "comment": ""
}}

Input text:
{user_text}
"""

    llm_response = await generate_json(prompt)
    cleaned = _strip_fences(llm_response)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:  # pragma: no cover - depends on LLM output
        raise RuntimeError(f"LLM returned invalid JSON: {exc}") from exc


async def apply_issue_update(payload: Dict[str, Any], *, source_text: str = "") -> Dict[str, Any]:
    issue_key = (payload.get("issueKey") or "").strip()
    if not issue_key:
        raise ValueError("Missing issueKey in update payload")

    fields = payload.get("fields") or {}
    update_fields: Dict[str, Any] = {}

    if _should_allow_summary_update(fields.get("summary"), source_text):
        update_fields["summary"] = fields["summary"].strip()

    description = fields.get("description")
    if isinstance(description, str) and description.strip():
        update_fields["description"] = build_adf(description)

    priority = fields.get("priority")
    if isinstance(priority, str) and priority.strip():
        update_fields["priority"] = {"name": priority.strip()}

    labels = _normalize_labels(fields.get("labels"))
    if labels:
        update_fields["labels"] = labels

    assignee = fields.get("assignee")
    if isinstance(assignee, str) and assignee.strip():
        account_id = await find_user_account_id(assignee)
        if account_id:
            update_fields["assignee"] = {"accountId": account_id}

    if update_fields:
        await jira_request(f"/rest/api/3/issue/{issue_key}", "PUT", {"fields": update_fields})

    comment = payload.get("comment")
    if isinstance(comment, str) and comment.strip():
        await jira_request(
            f"/rest/api/3/issue/{issue_key}/comment",
            "POST",
            {"body": build_adf(comment)},
        )

    return {"success": True, "issueKey": issue_key, "updatedFields": list(update_fields.keys())}


__all__ = ["analyze_issue_update", "apply_issue_update"]
