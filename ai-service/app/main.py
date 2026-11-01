"""AI Service Smart Reschedule Assistant — Gymnasyum (FastAPI).

Jalankan lokal:
    uvicorn app.main:app --reload --port 8000
Dokumentasi interaktif: http://localhost:8000/docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.classifier import load_classifier
from app.config import SERVICE_VERSION, settings
from app.drafting import create_draft
from app.extraction import extract_preference, extract_preference_llm, to_wib
from app.preprocessing import lexicon_loaded
from app.prompts import PROMPT_VERSION
from app.schemas import (
    AnalyzeData, AnalyzeRequest, ClassifyData, ClassifyRequest, DataResponse, DraftResponseData,
    DraftResponseRequest, ErrorResponse, HealthData, Intent, SchedulePreference,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

# Intent yang preferensinya dicoba lewat LLM jika rule-based kosong/ambigu
_PREFERENCE_INTENTS = {Intent.RESCHEDULE, Intent.SCHEDULE_INQUIRY}


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str):
        self.status_code, self.code, self.message = status_code, code, message


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Model dimuat sekali saat service start
    app.state.classifier = load_classifier(settings.intent_model_type, settings.intent_model_path)
    logger.info("Model %s (%s) dimuat. LLM aktif: %s", app.state.classifier.model_name,
                app.state.classifier.model_version, settings.llm_enabled)
    yield


app = FastAPI(
    title="Gymnasyum Smart Reschedule — AI Service",
    version=SERVICE_VERSION,
    description="Intent classification, ekstraksi preferensi jadwal, dan draft respons GenAI. "
                "Semua response sukses berbentuk `{\"data\": ...}`, error berbentuk `{\"error\": {\"code\", \"message\"}}`.",
    lifespan=lifespan,
)

ERROR_RESPONSES = {400: {"model": ErrorResponse}, 401: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}


# ------------------------------------------------------------------ error handling
def _error(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})


@app.exception_handler(ApiError)
async def api_error_handler(_: Request, exc: ApiError):
    return _error(exc.status_code, exc.code, exc.message)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    # Disamakan dengan Backend: validasi gagal = 400 VALIDATION_ERROR (bukan 422 bawaan FastAPI)
    first = exc.errors()[0] if exc.errors() else {}
    loc = ".".join(str(p) for p in first.get("loc", []) if p != "body")
    msg = first.get("msg", "Request tidak valid").removeprefix("Value error, ")
    return _error(400, "VALIDATION_ERROR", f"{loc}: {msg}" if loc else msg)


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(_: Request, exc: StarletteHTTPException):
    code = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}.get(exc.status_code, "HTTP_ERROR")
    return _error(exc.status_code, code, str(exc.detail))


@app.exception_handler(Exception)
async def unhandled_error_handler(_: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return _error(500, "INTERNAL_ERROR", "Terjadi kesalahan pada AI Service")


def require_api_key(x_api_key: str | None = Header(default=None)):
    if settings.api_key and x_api_key != settings.api_key:
        raise ApiError(401, "UNAUTHORIZED", "Header X-API-Key tidak valid")


# ------------------------------------------------------------------ endpoints
@app.get("/health", response_model=DataResponse[HealthData], tags=["health"])
def health(request: Request):
    clf = request.app.state.classifier
    return {"data": HealthData(
        service_version=SERVICE_VERSION, model_name=clf.model_name, model_version=clf.model_version,
        lexicon_loaded=lexicon_loaded(), llm_enabled=settings.llm_enabled, prompt_version=PROMPT_VERSION,
    )}


@app.post("/api/v1/classify", response_model=DataResponse[ClassifyData], responses=ERROR_RESPONSES,
          tags=["ai"], dependencies=[Depends(require_api_key)])
def classify(body: ClassifyRequest, request: Request):
    """Klasifikasi intent + confidence per kelas (untuk pengujian model)."""
    clf = request.app.state.classifier
    pred = clf.predict(body.message_text)
    return {"data": ClassifyData(
        intent=pred.intent, confidence=pred.confidence, needs_review=pred.confidence < settings.confidence_threshold,
        scores=pred.scores, model_version=clf.model_version,
    )}


@app.post("/api/v1/analyze", response_model=DataResponse[AnalyzeData], responses=ERROR_RESPONSES,
          tags=["ai"], dependencies=[Depends(require_api_key)])
def analyze(body: AnalyzeRequest, request: Request):
    """Intent + confidence + flag review + preferensi jadwal. Dipanggil Backend saat request reschedule dibuat."""
    clf = request.app.state.classifier
    pred = clf.predict(body.message_text)
    ts = to_wib(body.message_timestamp)
    intent = Intent(pred.intent)

    pref = extract_preference(body.message_text, ts)
    if intent in _PREFERENCE_INTENTS and (pref.is_empty or pref.is_ambiguous) and settings.llm_enabled:
        pref = extract_preference_llm(body.message_text, ts) or pref

    reasons = []
    if pred.confidence < settings.confidence_threshold:
        reasons.append("LOW_CONFIDENCE")
    if intent == Intent.RESCHEDULE and pref.is_empty:
        reasons.append("PREFERENCE_NOT_FOUND")
    if pref.is_ambiguous:
        reasons.append("AMBIGUOUS_PREFERENCE")

    return {"data": AnalyzeData(
        intent=intent, confidence=pred.confidence, needs_review=bool(reasons), review_reasons=reasons,
        preference=SchedulePreference(**pref.to_dict()), message_timestamp=ts.isoformat(),
        model_version=clf.model_version,
    )}


@app.post("/api/v1/draft-response", response_model=DataResponse[DraftResponseData], responses=ERROR_RESPONSES,
          tags=["ai"], dependencies=[Depends(require_api_key)])
def draft_response(body: DraftResponseRequest):
    """Draft balasan untuk ditinjau admin. Tidak pernah dikirim otomatis ke customer."""
    result = create_draft(body)
    return {"data": DraftResponseData(
        draft_text=result.draft_text, mentioned_slots=result.mentioned_slots, source=result.source,
        fallback_reason=result.fallback_reason, prompt_version=result.prompt_version,
    )}
