"""Konfigurasi AI Service, dibaca dari environment variable (lihat .env.example)."""
import os
from dataclasses import dataclass, field
from datetime import timedelta, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
WIB = timezone(timedelta(hours=7), name="WIB")

SERVICE_VERSION = "0.1.0"


def _float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except ValueError:
        return default


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    # Model intent classification: "tfidf" (baseline) atau "indobert"
    intent_model_type: str = field(default_factory=lambda: os.getenv("INTENT_MODEL_TYPE", "tfidf"))
    intent_model_path: Path = field(
        default_factory=lambda: Path(os.getenv("INTENT_MODEL_PATH", BASE_DIR / "models" / "intent_tfidf_lr.joblib"))
    )
    confidence_threshold: float = field(default_factory=lambda: _float("CONFIDENCE_THRESHOLD", 0.6))

    # LLM (Gemini). Jika GEMINI_API_KEY kosong, draft memakai template dan ekstraksi tanpa fallback LLM.
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
    llm_timeout_seconds: float = field(default_factory=lambda: _float("LLM_TIMEOUT_SECONDS", 8.0))
    llm_max_retries: int = field(default_factory=lambda: _int("LLM_MAX_RETRIES", 1))

    # Jam operasional gym, dipakai untuk memotong rentang pagi/siang/sore/malam
    gym_open_time: str = field(default_factory=lambda: os.getenv("GYM_OPEN_TIME", "06:00"))
    gym_close_time: str = field(default_factory=lambda: os.getenv("GYM_CLOSE_TIME", "21:00"))

    # Jika diisi, setiap request (kecuali /health dan /docs) wajib membawa header X-API-Key
    api_key: str = field(default_factory=lambda: os.getenv("AI_SERVICE_API_KEY", ""))

    @property
    def llm_enabled(self) -> bool:
        return bool(self.gemini_api_key)


settings = Settings()
