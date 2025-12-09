from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    template_id: str
    data: Dict[str, Any] | None = None
    fields: Dict[str, Any] | None = None
    output_filename: str = "generated.docx"


class PolishRequest(BaseModel):
    text: str
    field_name: str | None = None


class IssueDraft(BaseModel):
    summary: str | None = None
    description: str | None = None
    labels: List[str] | str | None = None
    components: List[str] | str | None = None
    priority: str | None = None
    assignee: str | None = None
    issueType: str | None = None
    epicKey: str | None = None
    estimate: float | int | None = None


class AICreateIssueRequest(BaseModel):
    projectKey: str | None = None
    text: str
    createOnJira: bool = False
    draft: IssueDraft | None = None
    contextText: str | None = None


class AIUpdateIssueRequest(BaseModel):
    text: str
