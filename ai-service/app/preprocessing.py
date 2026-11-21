"""Text preprocessing untuk pesan customer berbahasa Indonesia (informal).

Modul yang sama dipakai saat training (scripts/) dan inference (API), supaya
input model selalu konsisten. Kata negasi dan penanda waktu sengaja TIDAK dibuang
karena menentukan intent (mis. "tidak bisa" vs "bisa") dan preferensi jadwal.
"""
import csv
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

LEXICON_PATH = Path(__file__).resolve().parent.parent / "data" / "lexicon" / "colloquial-indonesian-lexicon.csv"

# Kamus domain gym/reschedule. Selalu menimpa Colloquial Indonesian Lexicon.
DOMAIN_SLANG: dict[str, str] = {
    # negasi -> "tidak" (lexicon memetakan ke "enggak", kita samakan)
    "gk": "tidak", "ga": "tidak", "gak": "tidak", "nggak": "tidak", "ngga": "tidak", "ngk": "tidak",
    "enggak": "tidak", "engga": "tidak", "tdk": "tidak", "kagak": "tidak", "g": "tidak",
    "gabisa": "tidak bisa", "gbs": "tidak bisa", "gabs": "tidak bisa", "gakbisa": "tidak bisa",
    "nggakbisa": "tidak bisa", "tdkbisa": "tidak bisa", "gajadi": "tidak jadi", "gajd": "tidak jadi",
    "gpp": "tidak apa apa", "gapapa": "tidak apa apa", "gausah": "tidak usah", "gaush": "tidak usah",
    # penanda waktu
    "bsk": "besok", "besuk": "besok", "bsok": "besok", "bso": "besok", "bsko": "besok", "lsa": "lusa",
    "mgg": "minggu", "mg": "minggu", "mingdep": "minggu depan", "mgdpn": "minggu depan", "dpn": "depan",
    "skrg": "sekarang", "skg": "sekarang", "ntar": "nanti", "nnti": "nanti", "entar": "nanti", "ntr": "nanti",
    "tgl": "tanggal", "tggl": "tanggal", "jm": "jam", "pkl": "pukul", "mlm": "malam", "mlam": "malam",
    "pgi": "pagi", "pg": "pagi", "sre": "sore", "siang": "siang", "seang": "siang", "sing": "siang",
    "sbtu": "sabtu", "sbt": "sabtu", "sab": "sabtu", "mnggu": "minggu", "kmis": "kamis", "kms": "kamis",
    "rbu": "rabu", "slasa": "selasa", "sls": "selasa", "snin": "senin", "snn": "senin", "jmt": "jumat",
    "jum'at": "jumat", "jumaat": "jumat", "kmrn": "kemarin", "kmarin": "kemarin",
    # domain gym
    "jdwl": "jadwal", "jadwl": "jadwal", "jdwal": "jadwal", "resched": "reschedule", "reskedul": "reschedule",
    "reschedul": "reschedule", "rescedule": "reschedule", "reskejul": "reschedule",
    "cancel": "batal", "cancell": "batal", "cancle": "batal", "cansel": "batal", "kensel": "batal",
    "cancelled": "batal", "batalin": "batalkan", "dibatalin": "dibatalkan", "cancelin": "batalkan",
    "kls": "kelas", "ksg": "kosong", "kosng": "kosong", "avail": "tersedia", "available": "tersedia",
    "pindahin": "pindahkan", "dipindahin": "dipindahkan", "gantiin": "gantikan", "ubh": "ubah",
    "min": "admin", "mimin": "admin", "kak": "kak", "ka": "kak", "kk": "kak", "kakk": "kak", "kakak": "kak",
    "mba": "mbak", "mbk": "mbak",
    # kata umum
    "sy": "saya", "sya": "saya", "gw": "saya", "gue": "saya", "aq": "aku", "ak": "aku",
    "bs": "bisa", "bsa": "bisa", "jd": "jadi", "jdi": "jadi", "aja": "saja", "aj": "saja", "ajah": "saja",
    "ajaa": "saja", "yg": "yang", "utk": "untuk", "tp": "tapi", "tpi": "tapi", "krn": "karena",
    "karna": "karena", "soalnya": "soalnya", "sm": "sama", "dgn": "dengan", "dg": "dengan",
    "udh": "sudah", "udah": "sudah", "sdh": "sudah", "blm": "belum", "lg": "lagi", "msh": "masih",
    "mo": "mau", "pengen": "ingin", "pgn": "ingin", "brp": "berapa", "berapaan": "berapa",
    "gmn": "bagaimana", "gimana": "bagaimana", "gmna": "bagaimana", "ok": "oke", "okay": "oke",
    "okey": "oke", "okeh": "oke", "oce": "oke", "makasih": "terima kasih", "mksh": "terima kasih",
    "makasi": "terima kasih", "mks": "terima kasih", "thx": "terima kasih", "thanks": "terima kasih",
    "thank": "terima kasih", "tq": "terima kasih", "trims": "terima kasih", "trmksh": "terima kasih",
    "dtg": "datang", "dateng": "datang", "ad": "ada", "kalo": "kalau", "klo": "kalau", "kl": "kalau",
    "dl": "dulu", "dlu": "dulu", "bgt": "banget", "bngt": "banget", "td": "tadi", "trs": "terus",
    "trus": "terus", "mohon": "mohon", "mhn": "mohon", "maap": "maaf", "mf": "maaf", "maf": "maaf",
    "sorry": "maaf", "sori": "maaf", "tlg": "tolong", "tolongin": "tolong", "bntr": "sebentar",
    "kpn": "kapan", "dmn": "di mana", "knp": "kenapa", "hrg": "harga", "hr": "hari",
}

_URL_RE = re.compile(r"(https?://\S+|www\.\S+)")
_MENTION_RE = re.compile(r"[@#]\w+")
_EMAIL_RE = re.compile(r"\S+@\S+\.\S+")
_PHONE_RE = re.compile(r"(\+62|62|0)8\d{7,11}")
_TIME_RE = re.compile(r"\b(\d{1,2})[.:](\d{2})\b")
_JAM_GLUE_RE = re.compile(r"\b(jam|pukul|pkl|jm)(\d)")
_REDUP_RE = re.compile(r"\b([a-z]{3,})2\b")
_REPEAT_RE = re.compile(r"([a-z])\1{2,}")
_WORD_HYPHEN_RE = re.compile(r"(?<=[a-z])-(?=[a-z])")
_NON_ALLOWED_RE = re.compile(r"[^a-z0-9:/\-?\s]")
_SPACE_RE = re.compile(r"\s+")


@lru_cache(maxsize=1)
def load_slang_dict() -> dict[str, str]:
    """Gabungan Colloquial Indonesian Lexicon (jika ada) + DOMAIN_SLANG."""
    merged: dict[str, str] = {}
    if LEXICON_PATH.exists():
        with LEXICON_PATH.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                merged[row["slang"]] = row["formal"]
    merged.update(DOMAIN_SLANG)
    # Satukan nilai lexicon yang masih punya bentuk kanonik di kamus domain (mis. "enggak" -> "tidak")
    for slang, formal in merged.items():
        merged[slang] = " ".join(DOMAIN_SLANG.get(tok, tok) for tok in formal.split())
    return merged


def lexicon_loaded() -> bool:
    return LEXICON_PATH.exists()


def _normalize_time(match: re.Match) -> str:
    hour, minute = int(match.group(1)), int(match.group(2))
    if hour > 24 or minute > 59:
        return match.group(0)
    return f"{hour:02d}:{minute:02d}"


def preprocess(text: str) -> str:
    """Normalisasi pesan customer menjadi teks bersih huruf kecil.

    >>> preprocess("Besok soreee gk bisaaa, pindah Sabtu jam 8.00 dong kak 🙏")
    'besok sore tidak bisa pindah sabtu jam 08:00 dong kak'
    """
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text).lower()
    text = _URL_RE.sub(" ", text)
    text = _EMAIL_RE.sub(" ", text)
    text = _MENTION_RE.sub(" ", text)
    text = _PHONE_RE.sub(" ", text)
    text = text.replace("jum'at", "jumat").replace("’", "'")
    text = _TIME_RE.sub(_normalize_time, text)
    text = _JAM_GLUE_RE.sub(r"\1 \2", text)
    text = _REDUP_RE.sub(r"\1 \1", text)
    text = _REPEAT_RE.sub(r"\1", text)
    text = _WORD_HYPHEN_RE.sub(" ", text)
    text = text.replace("?", " ? ")
    text = _NON_ALLOWED_RE.sub(" ", text)

    slang = load_slang_dict()
    tokens = []
    for tok in text.split():
        stripped = tok.strip("-/:")
        if not stripped:
            continue
        tokens.append(slang.get(stripped, stripped) if not _looks_numeric(stripped) else stripped)
    return _SPACE_RE.sub(" ", " ".join(tokens)).strip()


def _looks_numeric(tok: str) -> bool:
    return any(ch.isdigit() for ch in tok)
