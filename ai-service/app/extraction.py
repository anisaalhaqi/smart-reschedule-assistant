"""Ekstraksi preferensi jadwal (tanggal, hari, waktu) dari pesan informal.

Parser rule-based, dihitung relatif terhadap waktu pesan (WIB). Jika tidak
menemukan apa pun atau hasilnya ambigu, app.main akan mencoba fallback LLM.

Contoh: pesan "Besok sore nggak bisa, pindah Sabtu pagi dong" dikirim Jumat
2026-10-09 -> requested_date 2026-10-10 (Sabtu), time_of_day "pagi",
start_time 06:00, end_time 11:00. Klausa "besok sore nggak bisa" dilewati
karena itu jadwal lama yang ditolak, bukan preferensi baru.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta

from app import llm
from app.config import WIB, settings
from app.preprocessing import preprocess
from app.prompts import EXTRACTION_SYSTEM_PROMPT, build_extraction_user_prompt

DAY_NAMES = {"senin": 0, "selasa": 1, "rabu": 2, "kamis": 3, "jumat": 4, "sabtu": 5, "minggu": 6, "ahad": 6}
DAY_LABELS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
MONTHS = {
    "januari": 1, "jan": 1, "februari": 2, "pebruari": 2, "feb": 2, "maret": 3, "mar": 3, "april": 4,
    "apr": 4, "mei": 5, "juni": 6, "jun": 6, "juli": 7, "jul": 7, "agustus": 8, "agu": 8, "agt": 8,
    "ags": 8, "september": 9, "sept": 9, "sep": 9, "oktober": 10, "okt": 10, "november": 11, "nov": 11,
    "nop": 11, "desember": 12, "des": 12,
}
MONTH_LABELS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]
TIME_OF_DAY_RANGES = {"pagi": ("06:00", "11:00"), "siang": ("11:00", "15:00"), "sore": ("15:00", "18:00"),
                      "malam": ("18:00", "21:00")}

_MONTH_ALT = "|".join(sorted(MONTHS, key=len, reverse=True))
_DAY_ALT = "|".join(DAY_NAMES)
_PART_ALT = "pagi|siang|sore|malam"

# Klausa yang menyatakan jadwal LAMA/yang ditolak, bukan preferensi baru
_NEGATED_RE = re.compile(
    r"\b(tidak (bisa|dapat|sempat|jadi|hadir|datang|ikut)|berhalangan|ada halangan|bentrok|batal\w*|"
    r"dibatalkan|izin|absen|skip|libur dulu|off dulu|ada (acara|urusan|keperluan|halangan)|sakit|kurang sehat)\b"
)
# Penanda target perubahan jadwal: teks setelahnya adalah preferensi baru
_TARGET_RE = re.compile(
    r"\b(pindah\w*|dipindah\w*|ganti\w*|diganti\w*|ubah|diubah|geser\w*|digeser|reschedule|mundur\w*|"
    r"dimundurkan|maju\w*|dimajukan|tukar|ditukar|(?<!tidak )jadi|ke|gantinya|bisanya|maunya)\b"
)
# Dipakai pada teks mentah (sebelum preprocessing membuang tanda baca)
_RAW_CLAUSE_SPLIT_RE = re.compile(r"[,;!?\n]|\.(?=\s|$)")
_WORD_CLAUSE_SPLIT_RE = re.compile(r"\b(?:tapi|terus|soalnya|karena|lalu)\b")

_WEEK_RE = re.compile(r"\b(minggu|pekan) (depan|ini|lalu|kemarin)\b")
_N_WEEKS_RE = re.compile(r"\b\d+ (minggu|pekan)\b")
_DAY_RE = re.compile(rf"\b(?:hari )?({_DAY_ALT})(?: (ini|depan))?\b")
_DATE_NUMERIC_RE = re.compile(r"(?<!jam )(?<!pukul )\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b")
_DATE_MONTH_RE = re.compile(rf"\b(?:tanggal )?(\d{{1,2}}) ({_MONTH_ALT})(?: (\d{{4}}))?\b")
_DATE_DAY_ONLY_RE = re.compile(r"\btanggal (\d{1,2})\b")
_TIME_RANGE_RE = re.compile(
    rf"\b(?:jam |pukul )?(\d{{1,2}})(?::(\d{{2}}))? ?(?:-|sampai|sd|s/d|hingga) ?(\d{{1,2}})(?::(\d{{2}}))?"
    rf"(?: ?({_PART_ALT}))?\b"
)
_TIME_RE = re.compile(rf"\b(?:jam|pukul) (\d{{1,2}})(?::(\d{{2}}))?(?:an)?(?: ({_PART_ALT}))?\b")
_TIME_HHMM_RE = re.compile(rf"\b(\d{{1,2}}):(\d{{2}})(?: ({_PART_ALT}))?\b")
_TIME_BARE_PART_RE = re.compile(rf"\b(\d{{1,2}}) ({_PART_ALT})\b")
_HALF_RE = re.compile(rf"\bsetengah (\d{{1,2}})(?: ({_PART_ALT}))?\b")
_PART_RE = re.compile(rf"\b({_PART_ALT})\b")


@dataclass
class SchedulePreference:
    requested_date: str | None = None  # YYYY-MM-DD
    requested_time: str | None = None  # HH:MM
    day_name: str | None = None  # "Sabtu"
    time_of_day: str | None = None  # pagi | siang | sore | malam
    date_from: str | None = None  # rentang tanggal untuk filter slot (inklusif)
    date_to: str | None = None
    start_time: str | None = None  # rentang jam untuk filter slot: start_time <= slot.start_time < end_time
    end_time: str | None = None
    is_ambiguous: bool = False
    source: str = "NONE"  # RULE | LLM | NONE

    @property
    def is_empty(self) -> bool:
        return not any([self.requested_date, self.requested_time, self.day_name, self.time_of_day,
                        self.date_from])

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class _ClauseInfo:
    date: date | None = None
    weekday: int | None = None
    week_offset: int | None = None
    hour: int | None = None
    minute: int = 0
    end_hour: int | None = None
    end_minute: int = 0
    part: str | None = None
    ambiguous: bool = False

    @property
    def has_date(self) -> bool:
        return self.date is not None or self.weekday is not None or self.week_offset is not None

    @property
    def has_time(self) -> bool:
        return self.hour is not None or self.part is not None

    @property
    def has_info(self) -> bool:
        return self.has_date or self.has_time


def to_wib(ts: datetime | None) -> datetime:
    if ts is None:
        return datetime.now(WIB)
    if ts.tzinfo is None:
        return ts.replace(tzinfo=WIB)
    return ts.astimezone(WIB)


def format_date_id(value: str | date) -> str:
    """'2026-10-17' -> 'Sabtu, 17 Oktober 2026'."""
    d = date.fromisoformat(value) if isinstance(value, str) else value
    return f"{DAY_LABELS[d.weekday()]}, {d.day} {MONTH_LABELS[d.month - 1]} {d.year}"


def _hhmm(hour: int, minute: int = 0) -> str:
    return f"{hour:02d}:{minute:02d}"


def _to_minutes(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def _adjust_hour(hour: int, part: str | None) -> int:
    if part in ("sore", "malam") and hour < 12:
        return hour + 12
    if part == "siang" and hour <= 5:
        return hour + 12
    if part is None and 1 <= hour <= 5:
        # Gym tutup dini hari; "jam 4" hampir pasti jam 16:00
        return hour + 12
    return hour


def _part_of_hour(hour: int) -> str:
    if hour < 11:
        return "pagi"
    if hour < 15:
        return "siang"
    if hour < 18:
        return "sore"
    return "malam"


def _parse_clause(clause: str, today: date) -> _ClauseInfo:
    info = _ClauseInfo()
    text = clause

    # --- tanggal eksplisit ---
    if m := _DATE_MONTH_RE.search(text):
        day, month = int(m.group(1)), MONTHS[m.group(2)]
        year = int(m.group(3)) if m.group(3) else today.year
        info.date = _safe_date(year, month, day, today, roll_year=not m.group(3))
        text = text.replace(m.group(0), " ")
    elif m := _DATE_NUMERIC_RE.search(text):
        day, month = int(m.group(1)), int(m.group(2))
        year = m.group(3)
        year_val = (int(year) + 2000 if len(year) == 2 else int(year)) if year else today.year
        info.date = _safe_date(year_val, month, day, today, roll_year=not year)
        text = text.replace(m.group(0), " ")
    elif m := _DATE_DAY_ONLY_RE.search(text):
        day = int(m.group(1))
        candidate = _safe_date(today.year, today.month, day, today, roll_year=False)
        if candidate and candidate < today:
            nm_year, nm_month = (today.year + 1, 1) if today.month == 12 else (today.year, today.month + 1)
            candidate = _safe_date(nm_year, nm_month, day, today, roll_year=False)
        info.date = candidate
        text = text.replace(m.group(0), " ")

    # --- relatif ---
    if re.search(r"\blusa\b", text):
        info.date = info.date or today + timedelta(days=2)
    elif re.search(r"\bbesok\b", text):
        info.date = info.date or today + timedelta(days=1)
    elif re.search(r"\bhari ini\b|\bnanti (pagi|siang|sore|malam)\b|\bsekarang\b", text):
        info.date = info.date or today

    # --- minggu/pekan sebagai "week", bukan hari Minggu ---
    if m := _WEEK_RE.search(text):
        info.week_offset = {"depan": 1, "ini": 0, "lalu": -1, "kemarin": -1}[m.group(2)]
        text = text.replace(m.group(0), " ")
    text = _N_WEEKS_RE.sub(" ", text)

    # --- nama hari ---
    if m := _DAY_RE.search(text):
        info.weekday = DAY_NAMES[m.group(1)]
        qualifier = m.group(2)
        if info.date is None:
            if info.week_offset is not None:
                monday = today - timedelta(days=today.weekday())
                info.date = monday + timedelta(days=7 * info.week_offset + info.weekday)
            else:
                delta = (info.weekday - today.weekday()) % 7
                if delta == 0 and qualifier != "ini":
                    delta = 7
                    info.ambiguous = True  # "Sabtu" dikirim hari Sabtu: hari ini atau pekan depan?
                info.date = today + timedelta(days=delta)
        elif info.date.weekday() != info.weekday:
            info.ambiguous = True  # mis. "besok Sabtu" padahal besok Jumat

    # --- jam ---
    if m := _TIME_RANGE_RE.search(text):
        part = m.group(5) or (_PART_RE.search(text).group(1) if _PART_RE.search(text) else None)
        info.hour = _adjust_hour(int(m.group(1)), part)
        info.minute = int(m.group(2) or 0)
        info.end_hour = _adjust_hour(int(m.group(3)), part)
        info.end_minute = int(m.group(4) or 0)
        if info.end_hour <= info.hour:
            info.end_hour = info.end_hour + 12 if info.end_hour + 12 > info.hour else None
    elif m := _HALF_RE.search(text):
        part = m.group(2) or (_PART_RE.search(text).group(1) if _PART_RE.search(text) else None)
        info.hour = _adjust_hour(int(m.group(1)) - 1, part)
        info.minute = 30
    else:
        for regex in (_TIME_RE, _TIME_HHMM_RE, _TIME_BARE_PART_RE):
            if m := regex.search(text):
                groups = m.groups()
                hour = int(groups[0])
                minute = int(groups[1]) if regex is not _TIME_BARE_PART_RE and groups[1] else 0
                part = groups[-1] or (_PART_RE.search(text).group(1) if _PART_RE.search(text) else None)
                if hour <= 23 and minute <= 59:
                    info.hour = _adjust_hour(hour, part)
                    info.minute = minute
                break

    if m := _PART_RE.search(text):
        info.part = m.group(1)
    if info.hour is not None and info.hour > 23:
        info.hour = None
    return info


def _safe_date(year: int, month: int, day: int, today: date, roll_year: bool) -> date | None:
    try:
        d = date(year, month, day)
    except ValueError:
        return None
    if roll_year and d < today - timedelta(days=7):
        try:
            d = date(year + 1, month, day)
        except ValueError:
            return None
    return d


def _split_clauses(message_text: str) -> list[str]:
    """Pecah pesan menjadi klausa yang sudah dipreprocess.

    Selain tanda baca, klausa juga dipotong tepat sebelum penanda target
    ("pindah", "ganti", "ke", ...) supaya "besok sore tidak bisa pindah sabtu pagi"
    menjadi ["besok sore tidak bisa", "pindah sabtu pagi"].
    """
    clauses: list[str] = []
    for raw_part in _RAW_CLAUSE_SPLIT_RE.split(message_text):
        for part in _WORD_CLAUSE_SPLIT_RE.split(preprocess(raw_part)):
            part = part.strip()
            if not part:
                continue
            # "dari kamis ke sabtu": bagian setelah "ke" adalah target, sebelumnya jadwal lama
            if m := re.search(r"\bdari (.+?) (?:ke|jadi|menjadi) (.+)", part):
                clauses.append(m.group(1) + " tidak bisa")
                clauses.append("pindah " + m.group(2))
                continue
            starts = [0] + [m.start() for m in _TARGET_RE.finditer(part) if m.start() > 0]
            bounds = zip(starts, starts[1:] + [len(part)])
            clauses.extend(part[a:b].strip() for a, b in bounds if part[a:b].strip())
    return clauses


def _clamp_range(start: str, end: str) -> tuple[str, str]:
    open_m, close_m = _to_minutes(settings.gym_open_time), _to_minutes(settings.gym_close_time)
    s, e = max(_to_minutes(start), open_m), min(_to_minutes(end), close_m)
    if s >= e:
        return start, end
    return _hhmm(s // 60, s % 60), _hhmm(e // 60, e % 60)


def extract_preference(message_text: str, message_timestamp: datetime | None = None) -> SchedulePreference:
    """Ekstrak preferensi jadwal baru dari pesan customer."""
    today = to_wib(message_timestamp).date()
    clauses = [(c, _parse_clause(c, today)) for c in _split_clauses(message_text)]
    with_info = [(c, info) for c, info in clauses if info.has_info]
    if not with_info:
        return SchedulePreference()

    candidates = [(c, i) for c, i in with_info if not _NEGATED_RE.search(c) or _TARGET_RE.search(c)]
    if not candidates:
        return SchedulePreference()

    targeted = [(c, i) for c, i in candidates if _TARGET_RE.search(c)]
    _, main = (targeted or candidates)[-1]

    # Lengkapi komponen yang kosong dari klausa non-negasi lain ("pindah sabtu ya, jam 8 pagi")
    merged = _ClauseInfo(**vars(main))
    for _, other in candidates:
        if other is main:
            continue
        if not merged.has_date and other.has_date:
            merged.date, merged.weekday, merged.week_offset = other.date, other.weekday, other.week_offset
        if not merged.has_time and other.has_time:
            merged.hour, merged.minute, merged.part = other.hour, other.minute, other.part
            merged.end_hour, merged.end_minute = other.end_hour, other.end_minute
        merged.ambiguous = merged.ambiguous or other.ambiguous

    pref = SchedulePreference(source="RULE", is_ambiguous=merged.ambiguous)
    if merged.date:
        pref.requested_date = merged.date.isoformat()
        pref.day_name = DAY_LABELS[merged.date.weekday()]
        pref.date_from = pref.date_to = pref.requested_date
    elif merged.week_offset is not None:
        monday = today - timedelta(days=today.weekday()) + timedelta(days=7 * merged.week_offset)
        pref.date_from = max(monday, today).isoformat()
        pref.date_to = (monday + timedelta(days=6)).isoformat()

    if merged.hour is not None:
        pref.requested_time = _hhmm(merged.hour, merged.minute)
        pref.time_of_day = _part_of_hour(merged.hour)
        pref.start_time = pref.requested_time
        if merged.end_hour is not None:
            pref.end_time = _hhmm(merged.end_hour, merged.end_minute)
        else:
            end = min(merged.hour * 60 + merged.minute + 60, 23 * 60 + 59)
            pref.end_time = _hhmm(end // 60, end % 60)
    elif merged.part:
        pref.time_of_day = merged.part
        pref.start_time, pref.end_time = _clamp_range(*TIME_OF_DAY_RANGES[merged.part])
    return pref


def extract_preference_llm(message_text: str, message_timestamp: datetime | None = None) -> SchedulePreference | None:
    """Fallback LLM (output JSON) saat parser rule-based tidak menemukan/ambigu. None jika LLM nonaktif/gagal."""
    ts = to_wib(message_timestamp)
    data = llm.generate_json(
        EXTRACTION_SYSTEM_PROMPT,
        build_extraction_user_prompt(message_text, ts.isoformat(), DAY_LABELS[ts.weekday()]),
    )
    if not data:
        return None

    pref = SchedulePreference(source="LLM")
    try:
        if data.get("requested_date"):
            d = date.fromisoformat(str(data["requested_date"]))
            pref.requested_date = pref.date_from = pref.date_to = d.isoformat()
            pref.day_name = DAY_LABELS[d.weekday()]
        if data.get("requested_time"):
            h, m = (int(x) for x in str(data["requested_time"]).split(":")[:2])
            pref.requested_time = pref.start_time = _hhmm(h, m)
            end = min(h * 60 + m + 60, 23 * 60 + 59)
            pref.end_time = _hhmm(end // 60, end % 60)
            pref.time_of_day = _part_of_hour(h)
        elif data.get("time_of_day") in TIME_OF_DAY_RANGES:
            pref.time_of_day = data["time_of_day"]
            pref.start_time, pref.end_time = _clamp_range(*TIME_OF_DAY_RANGES[pref.time_of_day])
    except (ValueError, TypeError):
        return None
    return None if pref.is_empty else pref
