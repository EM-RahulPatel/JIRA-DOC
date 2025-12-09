"""Issue composition logic ported from the Node service."""

from __future__ import annotations

import asyncio
import json
import os
import re
from typing import Any, Dict, List

from .embedding import get_embedding_vector
from .llm_gateway import generate_json
from .project_context import get_project_context
from .text_utils import normalize_whitespace
from .vector_store import query_embeddings

DEFAULT_TOP_K = int(os.getenv("RAG_TOP_K") or 5)

SECTION_ORDER = [
    ("context", "Context"),
    ("scope", "Scope"),
    ("acceptance", "Acceptance Criteria"),
]


def _sanitize_array(value) -> List[str]:
    if not isinstance(value, list):
        return []
    result = []
    for item in value:
        if isinstance(item, str):
            text = item.strip().replace(" ", "-")
            if text:
                result.append(text)
    return result


def _format_chunk(chunk: Dict[str, Any]) -> str:
    metadata = chunk.get("metadata") or {}
    doc_id = metadata.get("docId", "unknown")
    index = metadata.get("chunkIndex", "?")
    text = metadata.get("text", "")
    return f"- {doc_id}#{index}: {text}"


def _strip_fences(text: str) -> str:
    fenced = re.sub(r"```json|```", "", text, flags=re.IGNORECASE)
    return fenced.strip()


def _normalize_description_sections(description: str) -> str:
    if not isinstance(description, str):
        return ""

    lines = description.splitlines()
    found_section = False
    current_key: str | None = None
    captured: Dict[str, List[str]] = {key: [] for key, _ in SECTION_ORDER}

    for raw_line in lines:
        stripped = raw_line.strip()
        header_match = re.match(r"^##\s+(.+)$", stripped, flags=re.IGNORECASE)
        if header_match:
            header_value = header_match.group(1).strip().lower().rstrip(":")
            matched_key = None
            for key, display in SECTION_ORDER:
                if header_value.startswith(display.lower()):
                    matched_key = key
                    break
            current_key = matched_key
            if matched_key:
                found_section = True
            continue

        if current_key:
            captured[current_key].append(raw_line.rstrip())

    if not found_section:
        return description.strip()

    acceptance_lines = captured["acceptance"]
    filtered_acceptance: List[str] = []
    for line in acceptance_lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith(("-", "*")) or re.match(r"^\d+[\.)]\s", stripped):
            filtered_acceptance.append(line.rstrip())
    if filtered_acceptance:
        captured["acceptance"] = filtered_acceptance

    parts: List[str] = []
    for key, display in SECTION_ORDER:
        body = "\n".join(captured[key]).strip()
        normalized_body = body or "_No details provided._"
        parts.append(f"## {display}\n{normalized_body}")

    return "\n\n".join(parts).strip()


async def compose_issue_from_prompt(
    project_key: str,
    user_prompt: str,
    context_text: str | None = None,
) -> Dict[str, Any]:
    if not user_prompt:
        raise ValueError("user_prompt is required")
    project = await get_project_context(project_key)
    rag_config = project.get("ragConfig") or {}
    top_k = int(rag_config.get("topK") or DEFAULT_TOP_K)
    cleaned_context = normalize_whitespace(context_text) if context_text else ""
    rag_chunks: List[Dict[str, Any]] = []
    reference_notes = []

    if cleaned_context:
        reference_notes.append("Document context provided by the user session.")
    else:
        embedding = await get_embedding_vector(user_prompt)
        rag_chunks = await asyncio.to_thread(query_embeddings, project["key"], embedding, top_k)
        if rag_chunks:
            reference_notes.append("Top knowledge base excerpts were used.")

    doc_context_block = cleaned_context or "(No additional document context provided)"
    reference_block = "\n".join(_format_chunk(chunk) for chunk in rag_chunks) or "(No project excerpts used)"

    prompt = (
        f"You are an AI issue assistant for project {project['key']}.\n"
        f"Project metadata: {json.dumps({'mapping': project.get('mapping'), 'templates': project.get('templates')}, indent=2)}\n"
        f"Project description: {project.get('description') or '(none provided)'}\n"
        f"Document context (latest upload or form data):\n{doc_context_block}\n\n"
        f"Project references (only if needed):\n{reference_block}\n\n"
        "User request:\n"
        + user_prompt
        + "\n\nRules:\n"
        + "- Always ground the response in the provided document context when available.\n"
        + "- Summary must be <= 15 words and action oriented.\n"
        + "- Description MUST be markdown with three sections in this order: '## Context', '## Scope', '## Acceptance Criteria'.\n"
        + "- Under Acceptance Criteria include 3 to 5 bullet points that start with verbs.\n"
        + "- If information is missing, state what assumptions are being made.\n"
        + "- Labels and components must be comma-separated strings converted to arrays.\n"
        + "- Priority must be one of: Highest, High, Medium, Low, Lowest.\n"
        + "- Estimate is numeric story points if mentioned, otherwise omit or null.\n\n"
        "Return ONLY valid JSON matching this schema:\n"
        '{"summary": "", "description": "", "labels": [], "components": [], '
        '"priority": "High|Medium|Low|Highest|Lowest", "assignee": "", "issueType": "Task|Bug|Story|Sub-task", '
        '"epicKey": "", "estimate": "number or empty"}'
    )

    llm_response = await generate_json(prompt)
    cleaned = _strip_fences(llm_response)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:  # pragma: no cover - depends on LLM output
        raise RuntimeError(f"LLM returned invalid JSON: {exc}") from exc

    summary = parsed.get("summary") if isinstance(parsed, dict) else None
    if not isinstance(summary, str) or not summary.strip():
        summary = normalize_whitespace(user_prompt)[:120]

    description = parsed.get("description", "") if isinstance(parsed.get("description"), str) else ""
    description = _normalize_description_sections(description)

    return {
        "projectKey": project["key"],
        "prompt": prompt,
        "ragChunks": rag_chunks,
        "notes": reference_notes,
        "generated": {
            "summary": summary.strip(),
            "description": description,
            "labels": _sanitize_array(parsed.get("labels")),
            "components": _sanitize_array(parsed.get("components")),
            "priority": parsed.get("priority") if isinstance(parsed.get("priority"), str) else "Medium",
            "assignee": parsed.get("assignee", "").strip() if isinstance(parsed.get("assignee"), str) else "",
            "issueType": parsed.get("issueType") if isinstance(parsed.get("issueType"), str) else "Task",
            "epicKey": parsed.get("epicKey", "").strip().upper()
            if isinstance(parsed.get("epicKey"), str)
            else "",
            "estimate": parsed.get("estimate"),
        },
    }


__all__ = ["compose_issue_from_prompt"]
