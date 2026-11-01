"""Client minimal Gemini API (REST) dengan timeout dan retry terbatas.

Jika GEMINI_API_KEY tidak diisi atau request gagal, fungsi mengembalikan None
dan pemanggil wajib memakai fallback (template / hasil rule-based).
"""
import json
import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def generate(system_prompt: str, user_prompt: str, *, json_output: bool = False,
             temperature: float = 0.4, max_output_tokens: int = 1024) -> str | None:
    if not settings.llm_enabled:
        return None

    body = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_output_tokens},
    }
    if json_output:
        body["generationConfig"]["responseMimeType"] = "application/json"
    if "2.5" in settings.gemini_model:
        # Matikan "thinking": lebih cepat dan token output tidak habis sebelum teks jadi
        body["generationConfig"]["thinkingConfig"] = {"thinkingBudget": 0}

    url = GEMINI_URL.format(model=settings.gemini_model)
    headers = {"x-goog-api-key": settings.gemini_api_key, "Content-Type": "application/json"}
    for attempt in range(settings.llm_max_retries + 1):
        try:
            resp = httpx.post(url, json=body, headers=headers, timeout=settings.llm_timeout_seconds)
            if resp.status_code in (400, 401, 403, 429):
                # Kuota habis / key salah: retry tidak membantu, langsung fallback
                logger.warning("Gemini menolak request (%s): %s", resp.status_code, resp.text[:200])
                return None
            resp.raise_for_status()
            parts = resp.json()["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts).strip()
            if text:
                return text
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
            logger.warning("Gemini gagal (percobaan %d): %s", attempt + 1, exc)
    return None


def generate_json(system_prompt: str, user_prompt: str) -> dict | None:
    raw = generate(system_prompt, user_prompt, json_output=True, temperature=0.0)
    if raw is None:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Output LLM bukan JSON valid: %s", raw[:200])
        return None
    return data if isinstance(data, dict) else None
