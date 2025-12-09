"""API router aggregation for the unified backend stack."""

from fastapi import APIRouter

from .ai import router as ai_router
from .docx import router as docx_router
from .jira import router as jira_router

router = APIRouter()
router.include_router(docx_router)
router.include_router(jira_router)
router.include_router(ai_router)

__all__ = ["router"]
