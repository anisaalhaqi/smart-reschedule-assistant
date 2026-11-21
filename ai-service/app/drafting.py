"""Draft balasan customer: LLM (Gemini) dengan guardrail + fallback template per intent.

Guardrail: draft LLM hanya lolos jika setiap tanggal, nama hari, dan jam yang
disebut ada di data yang dikirim Backend (jadwal awal, jadwal disetujui, slot
tersedia). Jika LLM nonaktif, gagal, atau melanggar guardrail, dipakai template.
"""
import re
from dataclasses import dataclass, field
from datetime import date

from app import llm
from app.extraction import DAY_LABELS, MONTHS, format_date_id
from app.prompts import DRAFT_SYSTEM_PROMPT, PROMPT_VERSION, build_draft_user_prompt
from app.schemas import DraftResponseRequest, Intent, RequestStatus, SlotIn

MAX_SLOTS_IN_DRAFT = 5
_NAME_PREFIXES = {"bu", "ibu", "pak", "bapak", "kak", "mbak", "mas"}

_MONTH_ALT = "|".join(sorted(MONTHS, key=len, reverse=True))
_DATE_IN_TEXT_RE = re.compile(rf"\b(\d{{1,2}})\s+({_MONTH_ALT})\b", re.I)
_TIME_IN_TEXT_RE = re.compile(r"\b(\d{1,2})[.:](\d{2})\b")
_HOUR_IN_TEXT_RE = re.compile(r"\b(?:jam|pukul)\s+(\d{1,2})\b(?![.:]\d)", re.I)
_DAY_IN_TEXT_RE = re.compile(r"\b(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b(?!\s+(?:depan|ini|lalu))", re.I)


@dataclass
class DraftResult:
    draft_text: str
    mentioned_slots: list[dict]
    source: str
    fallback_reason: str | None = None
    prompt_version: str = PROMPT_VERSION


@dataclass
class _Context:
    req: DraftResponseRequest
    greeting: str
    slots: list[SlotIn]
    allowed_dates: set[date] = field(default_factory=set)
    allowed_times: set[str] = field(default_factory=set)


def _greeting(req: DraftResponseRequest) -> str:
    name = req.customer_name or (req.schedule.customer_name if req.schedule else None) or ""
    parts = [p for p in name.split() if p.lower().strip(".") not in _NAME_PREFIXES]
    # Privasi: hanya nama panggilan (kata pertama) yang dipakai/dikirim ke LLM
    return f"{req.salutation} {parts[0]}" if parts else req.salutation


def _slot_label(slot: SlotIn) -> str:
    end = f"–{slot.end_time}" if slot.end_time else ""
    return f"{format_date_id(slot.date)} pukul {slot.start_time}{end}"


def _build_context(req: DraftResponseRequest) -> _Context:
    slots = sorted((s for s in req.available_slots if s.available), key=lambda s: (s.date, s.start_time))
    ctx = _Context(req=req, greeting=_greeting(req), slots=slots[:MAX_SLOTS_IN_DRAFT])
    if req.schedule:
        ctx.allowed_dates.add(date.fromisoformat(req.schedule.date))
        ctx.allowed_times.add(req.schedule.time)
    if req.approved_date:
        ctx.allowed_dates.add(date.fromisoformat(req.approved_date))
    if req.approved_time:
        ctx.allowed_times.add(req.approved_time)
    for s in ctx.slots:
        ctx.allowed_dates.add(date.fromisoformat(s.date))
        ctx.allowed_times.add(s.start_time)
        if s.end_time:
            ctx.allowed_times.add(s.end_time)
    return ctx


def _original_label(req: DraftResponseRequest) -> str | None:
    if not req.schedule:
        return None
    return f"{format_date_id(req.schedule.date)} pukul {req.schedule.time}"


def _approved_label(req: DraftResponseRequest) -> str | None:
    if req.approved_date and req.approved_time:
        return f"{format_date_id(req.approved_date)} pukul {req.approved_time}"
    return None


def _class_phrase(req: DraftResponseRequest) -> str:
    return f"sesi {req.schedule.class_name}" if req.schedule and req.schedule.class_name else "sesi"


# ---------------------------------------------------------------- template
def render_template(ctx: _Context) -> tuple[str, list[dict]]:
    req, g = ctx.req, ctx.greeting
    sesi = _class_phrase(req)
    original, approved = _original_label(req), _approved_label(req)
    slot_block = "\n".join(f"• {_slot_label(s)}" for s in ctx.slots)
    mentioned = [_mentioned(s) for s in ctx.slots]
    status = req.status

    if req.intent == Intent.RESCHEDULE:
        if status == RequestStatus.APPROVED:
            dari = f" dari {original}" if original else ""
            text = (f"Halo {g}, terima kasih sudah mengabari 🙏 {sesi.capitalize()}{dari} sudah kami pindahkan ke "
                    f"{approved}. Sampai bertemu di Gymnasyum ya, {g}!")
            return text, _approved_mentions(req)
        if status == RequestStatus.REJECTED:
            if ctx.slots:
                text = (f"Halo {g}, mohon maaf jadwal yang {g} minta belum bisa kami penuhi. "
                        f"Berikut slot yang masih tersedia:\n{slot_block}\nSilakan pilih yang paling nyaman ya, {g}.")
                return text, mentioned
            return (f"Halo {g}, mohon maaf untuk saat ini belum ada slot yang sesuai. Kami akan segera mengabari "
                    f"{g} jika ada slot kosong 🙏"), []
        if ctx.slots:
            text = (f"Halo {g}, permintaan pindah jadwal sudah kami terima 🙏 Slot yang masih tersedia:\n{slot_block}\n"
                    f"Mau dipindahkan ke slot yang mana, {g}?")
            return text, mentioned
        return f"Halo {g}, permintaan pindah jadwal sudah kami terima dan sedang kami cek ketersediaannya ya 🙏", []

    if req.intent == Intent.CANCELLATION:
        jadwal = f" pada {original}" if original else ""
        if status == RequestStatus.APPROVED:
            text = (f"Halo {g}, {sesi}{jadwal} sudah kami batalkan ya. Semoga semuanya lancar, dan kabari kami kapan "
                    f"saja jika ingin booking kembali 🙏")
        else:
            text = (f"Halo {g}, pesan pembatalan {sesi}{jadwal} sudah kami terima dan sedang kami proses ya. "
                    f"Kabari kami kapan saja jika ingin booking kembali 🙏")
        return text, []

    if req.intent == Intent.SCHEDULE_INQUIRY:
        if ctx.slots:
            text = (f"Halo {g}, berikut slot yang masih tersedia:\n{slot_block}\n"
                    f"Silakan kabari kami slot mana yang ingin {g} pilih ya 😊")
            return text, mentioned
        return (f"Halo {g}, mohon maaf untuk waktu tersebut belum ada slot yang tersedia. "
                f"Apakah {g} berkenan dengan hari atau jam lain?"), []

    if req.intent == Intent.CONFIRMATION:
        target = approved or original
        if target:
            mentions = _approved_mentions(req) if approved else []
            return f"Terima kasih {g} atas konfirmasinya 🙏 Kami tunggu kehadirannya pada {target} ya.", mentions
        return f"Terima kasih {g} atas konfirmasinya 🙏 Sampai bertemu di Gymnasyum ya.", []

    return f"Halo {g}, terima kasih sudah menghubungi Gymnasyum 🙏 Pesan {g} sudah kami terima dan akan segera kami bantu ya.", []


def _mentioned(slot: SlotIn) -> dict:
    return {"slot_id": slot.slot_id, "date": slot.date, "start_time": slot.start_time}


def _approved_mentions(req: DraftResponseRequest) -> list[dict]:
    if not (req.approved_date and req.approved_time):
        return []
    match = next((s for s in req.available_slots
                  if s.date == req.approved_date and s.start_time == req.approved_time), None)
    return [{"slot_id": match.slot_id if match else None, "date": req.approved_date, "start_time": req.approved_time}]


# ---------------------------------------------------------------- guardrail
def validate_draft(text: str, ctx: _Context) -> tuple[str | None, list[dict]]:
    """Kembalikan (alasan_gagal | None, mentioned_slots)."""
    if not text or len(text) > 1200:
        return "EMPTY_OR_TOO_LONG", []
    if re.search(r"[\[\]{}]", text):
        return "PLACEHOLDER_FOUND", []

    allowed_days_months = {(d.day, d.month) for d in ctx.allowed_dates}
    for m in _DATE_IN_TEXT_RE.finditer(text):
        if (int(m.group(1)), MONTHS[m.group(2).lower()]) not in allowed_days_months:
            return f"UNKNOWN_DATE:{m.group(0)}", []

    allowed_weekdays = {DAY_LABELS[d.weekday()].lower() for d in ctx.allowed_dates}
    for m in _DAY_IN_TEXT_RE.finditer(text):
        if m.group(1).lower() not in allowed_weekdays:
            return f"UNKNOWN_DAY:{m.group(1)}", []

    times_found = {f"{int(h):02d}:{mm}" for h, mm in _TIME_IN_TEXT_RE.findall(text)}
    for t in times_found:
        if t not in ctx.allowed_times:
            return f"UNKNOWN_TIME:{t}", []
    allowed_hours = {int(t[:2]) for t in ctx.allowed_times}
    for h in _HOUR_IN_TEXT_RE.findall(text):
        if int(h) not in allowed_hours and int(h) + 12 not in allowed_hours:
            return f"UNKNOWN_TIME:jam {h}", []

    req = ctx.req
    if req.status == RequestStatus.APPROVED and req.approved_time and req.approved_time not in times_found:
        return "APPROVED_SLOT_NOT_MENTIONED", []

    if req.status == RequestStatus.APPROVED and req.approved_date:
        mentioned = _approved_mentions(req)
    else:
        dates_found = {(int(d), MONTHS[mo.lower()]) for d, mo in _DATE_IN_TEXT_RE.findall(text)}
        mentioned = [
            _mentioned(s) for s in ctx.slots
            if s.start_time in times_found
            and (not dates_found or (date.fromisoformat(s.date).day, date.fromisoformat(s.date).month) in dates_found)
        ]
    return None, mentioned


# ---------------------------------------------------------------- entrypoint
def create_draft(req: DraftResponseRequest) -> DraftResult:
    ctx = _build_context(req)
    template_text, template_mentions = render_template(ctx)

    prompt_ctx = {
        "intent": req.intent.value,
        "greeting": ctx.greeting,
        "class_name": req.schedule.class_name if req.schedule else None,
        "original_schedule": _original_label(req),
        "approved_schedule": _approved_label(req),
        "status": req.status.value,
        "slot_lines": [_slot_label(s) for s in ctx.slots],
        "message_text": req.message_text,
    }
    llm_text = llm.generate(DRAFT_SYSTEM_PROMPT, build_draft_user_prompt(prompt_ctx))
    if llm_text is None:
        return DraftResult(template_text, template_mentions, "TEMPLATE", fallback_reason="LLM_UNAVAILABLE")

    llm_text = llm_text.replace("*", "").strip()
    reason, mentions = validate_draft(llm_text, ctx)
    if reason:
        return DraftResult(template_text, template_mentions, "TEMPLATE", fallback_reason=f"GUARDRAIL:{reason}")
    return DraftResult(llm_text, mentions, "LLM")

