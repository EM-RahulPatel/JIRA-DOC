from __future__ import annotations

import os
import re
from pathlib import Path

from dotenv import load_dotenv
import google.generativeai as genai

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

TEMPLATES_DIR = BASE_DIR / "templates"
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

METADATA_DIR = TEMPLATES_DIR / "_meta"
METADATA_DIR.mkdir(exist_ok=True)

PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}")
STOPWORDS = {"and", "or", "the", "a", "an", "of", "for", "to", "in", "on", "with", "by", "&", "at", "as", "from"}
TOP_LEVEL_HEADING_RE = re.compile(r"^\d+\.(?!\d)\s+.+")
SCHEMA_VERSION = 2

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
POLISH_MODEL_ID = (
    os.getenv("POLISH_MODEL")
    or os.getenv("DOC_POLISH_MODEL")
    or os.getenv("LLM_MODEL")
    or os.getenv("GEMINI_MODEL")
    or "gemini-1.5-flash"
)

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    try:
        GEMINI_MODEL = genai.GenerativeModel(POLISH_MODEL_ID)
    except Exception:
        GEMINI_MODEL = None
else:
    GEMINI_MODEL = None
