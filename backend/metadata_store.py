from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from constants import METADATA_DIR


def metadata_path(template_id: str) -> Path:
    return METADATA_DIR / f"{template_id}.json"


def save_metadata(template_id: str, metadata: Dict[str, Any]) -> None:
    metadata_path(template_id).write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def load_metadata(template_id: str) -> Dict[str, Any]:
    path = metadata_path(template_id)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {}
