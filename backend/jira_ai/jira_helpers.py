"""Helper utilities for Jira payloads."""

from __future__ import annotations

from typing import Dict, List


def build_adf(text: str | None) -> Dict:
    lines: List[Dict] = []
    if text:
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            lines.append({"type": "paragraph", "content": [{"type": "text", "text": line}]})

    if not lines:
        lines = [{"type": "paragraph", "content": [{"type": "text", "text": ""}]}]

    return {"type": "doc", "version": 1, "content": lines}


__all__ = ["build_adf"]
