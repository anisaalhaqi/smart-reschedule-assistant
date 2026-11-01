"""Skema request/response AI Service.

Nama field mengikuti API contract Web (snake_case, tanggal YYYY-MM-DD, jam HH:MM,
status PENDING/APPROVED/REJECTED, response sukses {"data": ...}, error
{"error": {"code", "message"}}) supaya Backend bisa meneruskan objek schedule
dan available slot apa adanya.
"""
from datetime import datetime
from enum import Enum
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"
TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"

T = TypeVar("T")


class Intent(str, Enum):
    RESCHEDULE = "RESCHEDULE"
    CANCELLATION = "CANCELLATION"
    SCHEDULE_INQUIRY = "SCHEDULE_INQUIRY"
    CONFIRMATION = "CONFIRMATION"
    OTHER = "OTHER"


class RequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class DataResponse(BaseModel, Generic[T]):
    data: T


class ErrorBody(BaseModel):
    code: str = Field(examples=["VALIDATION_ERROR"])
    message: str = Field(examples=["message_text wajib diisi"])


class ErrorResponse(BaseModel):
    error: ErrorBody


# ---------- /health ----------
class HealthData(BaseModel):
    status: Literal["ok"] = "ok"
    service_version: str
    model_name: str
    model_version: str
    lexicon_loaded: bool
    llm_enabled: bool
    prompt_version: str


# ---------- /api/v1/classify ----------
class ClassifyRequest(BaseModel):
    message_text: str = Field(min_length=1, max_length=2000, examples=["Besok sore nggak bisa, pindah Sabtu pagi dong"])

    @field_validator("message_text")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("message_text tidak boleh kosong")
        return v


class ClassifyData(BaseModel):
    intent: Intent
    confidence: float
    needs_review: bool
    scores: dict[str, float]
    model_version: str


# ---------- /api/v1/analyze ----------
class AnalyzeRequest(ClassifyRequest):
    message_timestamp: datetime | None = Field(
        default=None,
        description="ISO 8601. Tanpa zona waktu dianggap WIB (+07:00). Kosong = waktu server sekarang.",
        examples=["2026-10-09T19:00:00+07:00"],
    )


class SchedulePreference(BaseModel):
    requested_date: str | None = Field(None, examples=["2026-10-10"])
    requested_time: str | None = Field(None, examples=["08:00"])
    day_name: str | None = Field(None, examples=["Sabtu"])
    time_of_day: Literal["pagi", "siang", "sore", "malam"] | None = Field(None, examples=["pagi"])
    date_from: str | None = Field(None, description="Rentang tanggal untuk filter slot (inklusif)")
    date_to: str | None = None
    start_time: str | None = Field(None, description="Rentang jam: start_time <= slot.start_time < end_time")
    end_time: str | None = None
    is_ambiguous: bool = False
    source: Literal["RULE", "LLM", "NONE"] = "NONE"


ReviewReason = Literal["LOW_CONFIDENCE", "PREFERENCE_NOT_FOUND", "AMBIGUOUS_PREFERENCE"]


class AnalyzeData(BaseModel):
    intent: Intent
    confidence: float
    needs_review: bool
    review_reasons: list[ReviewReason]
    preference: SchedulePreference
    message_timestamp: str = Field(description="Waktu pesan yang dipakai, dinormalisasi ke WIB")
    model_version: str


# ---------- /api/v1/draft-response ----------
class ScheduleIn(BaseModel):
    """Objek schedule dari GET /api/schedules/:id (field lain diabaikan)."""
    model_config = ConfigDict(extra="ignore")

    id: int | str | None = None
    customer_name: str | None = None
    class_name: str | None = None
    date: str = Field(pattern=DATE_PATTERN)
    time: str = Field(pattern=TIME_PATTERN)


class SlotIn(BaseModel):
    """Objek slot dari GET /api/available-slots (field lain diabaikan)."""
    model_config = ConfigDict(extra="ignore")

    slot_id: int | str | None = None
    date: str = Field(pattern=DATE_PATTERN)
    start_time: str = Field(pattern=TIME_PATTERN)
    end_time: str | None = Field(None, pattern=TIME_PATTERN)
    available: bool = True


class DraftResponseRequest(BaseModel):
    intent: Intent
    customer_name: str | None = Field(None, description="Jika kosong, diambil dari schedule.customer_name",
                                      examples=["Budi Santoso"])
    salutation: Literal["Kak", "Bapak", "Ibu"] = "Kak"
    schedule: ScheduleIn | None = None
    preference: SchedulePreference | None = None
    available_slots: list[SlotIn] = Field(default_factory=list, max_length=20)
    status: RequestStatus = Field(RequestStatus.PENDING, description="Keputusan admin (sama dengan status request)")
    approved_date: str | None = Field(None, pattern=DATE_PATTERN)
    approved_time: str | None = Field(None, pattern=TIME_PATTERN)
    message_text: str | None = Field(None, max_length=2000)

    @model_validator(mode="after")
    def approved_needs_slot(self):
        if self.status == RequestStatus.APPROVED and self.intent == Intent.RESCHEDULE and not (
            self.approved_date and self.approved_time
        ):
            raise ValueError("approved_date dan approved_time wajib diisi jika status APPROVED untuk RESCHEDULE")
        return self


class MentionedSlot(BaseModel):
    slot_id: int | str | None = None
    date: str
    start_time: str


class DraftResponseData(BaseModel):
    draft_text: str
    mentioned_slots: list[MentionedSlot]
    source: Literal["LLM", "TEMPLATE"]
    fallback_reason: str | None = Field(None, description="Alasan memakai template (LLM nonaktif/gagal/guardrail)")
    prompt_version: str
