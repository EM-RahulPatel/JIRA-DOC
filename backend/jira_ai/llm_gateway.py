"""LLM gateway using Google Generative AI."""

from __future__ import annotations

import asyncio
import os

import google.generativeai as genai

API_KEY = (
    os.getenv("GEMINI_API_KEY")
    or os.getenv("GOOGLE_API_KEY")
    or os.getenv("OPENAI_API_KEY")
)
MODEL_ID = os.getenv("LLM_MODEL") or os.getenv("GEMINI_MODEL") or "gemini-1.5-flash"

_text_model = None
if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        _text_model = genai.GenerativeModel(model_name=MODEL_ID)
    except Exception as exc:  # pragma: no cover
        print(f"[LLM] Failed to initialize generative model: {exc}")


async def generate_json(prompt: str) -> str:
    if not _text_model:
        raise RuntimeError("LLM client is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY.")
    response = await asyncio.to_thread(_text_model.generate_content, prompt)
    text = getattr(response, "text", None)
    if not text:
        raise RuntimeError("LLM response was empty")
    cleaned = text.strip()
    if not cleaned:
        raise RuntimeError("LLM returned empty text")
    return cleaned


__all__ = ["generate_json"]
