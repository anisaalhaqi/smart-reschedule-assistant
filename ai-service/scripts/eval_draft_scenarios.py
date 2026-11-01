"""Evaluasi draft respons GenAI pada skenario uji.

Menjalankan setiap skenario lewat app.drafting.create_draft lalu mencatat:
- source (LLM/TEMPLATE) dan fallback_reason
- cek otomatis "slot fiktif": jam/tanggal di draft yang tidak ada di input (target plan: 0)
- kolom rubrik kosong (ketepatan slot, kesesuaian intent, kejelasan, kesopanan; skala 1–5)
  untuk diisi manual oleh tim

Free tier Gemini dibatasi request per menit, jadi ada jeda antar-skenario (--delay).

Pemakaian:
    python scripts/eval_draft_scenarios.py --delay 13
"""
import argparse
import csv
import itertools
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.config import settings  # noqa: E402
from app.drafting import _build_context, create_draft, validate_draft  # noqa: E402
from app.schemas import DraftResponseRequest  # noqa: E402

CUSTOMERS = [("Budi Santoso", "Kak"), ("Ratna Wijaya", "Ibu"), ("Hendra Gunawan", "Bapak"), ("Siska", "Kak"),
             ("Lestari", "Ibu")]
CLASSES = ["Personal Training", "Yoga", "Senam Lansia", "Pilates", "Zumba"]
SLOT_SETS = [
    [],
    [{"slot_id": 701, "date": "2026-10-17", "start_time": "08:00", "end_time": "09:00"}],
    [{"slot_id": 701, "date": "2026-10-17", "start_time": "08:00", "end_time": "09:00"},
     {"slot_id": 702, "date": "2026-10-17", "start_time": "10:00", "end_time": "11:00"},
     {"slot_id": 705, "date": "2026-10-18", "start_time": "16:00", "end_time": "17:00"}],
]
MESSAGES = {
    "RESCHEDULE": "Besok sore nggak bisa, pindah Sabtu pagi dong",
    "CANCELLATION": "Kak, sesi Kamis saya batalkan dulu ya, lagi kurang sehat",
    "SCHEDULE_INQUIRY": "Sabtu pagi coach-nya ada slot kosong nggak kak?",
    "CONFIRMATION": "Oke kak, Sabtu jam 8 aja ya, makasih",
    "OTHER": "Kak, paket private coaching berapa ya?",
}
STATUS_BY_INTENT = {
    "RESCHEDULE": ["APPROVED", "PENDING", "REJECTED"],
    "CANCELLATION": ["APPROVED", "PENDING"],
    "SCHEDULE_INQUIRY": ["PENDING"],
    "CONFIRMATION": ["APPROVED", "PENDING"],
    "OTHER": ["PENDING"],
}


def build_scenarios() -> list[dict]:
    scenarios = []
    counter = itertools.count(1)
    for intent, statuses in STATUS_BY_INTENT.items():
        for status in statuses:
            for slots in SLOT_SETS:
                if status == "APPROVED" and intent in ("RESCHEDULE", "CONFIRMATION") and not slots:
                    continue
                i = next(counter)
                name, salutation = CUSTOMERS[i % len(CUSTOMERS)]
                body = {
                    "intent": intent, "customer_name": name, "salutation": salutation,
                    "schedule": {"id": 100 + i, "class_name": CLASSES[i % len(CLASSES)], "date": "2026-10-15",
                                 "time": "09:00"},
                    "available_slots": slots, "status": status, "message_text": MESSAGES[intent],
                }
                if status == "APPROVED" and slots:
                    body["approved_date"], body["approved_time"] = slots[0]["date"], slots[0]["start_time"]
                scenarios.append({"scenario_id": f"S{i:02d}", **body})
    return scenarios


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--delay", type=float, default=13.0, help="jeda antar-skenario (detik)")
    args = parser.parse_args()

    scenarios = build_scenarios()
    rows = []
    for n, sc in enumerate(scenarios):
        req = DraftResponseRequest(**{k: v for k, v in sc.items() if k != "scenario_id"})
        result = create_draft(req)
        hallucination, _ = validate_draft(result.draft_text, _build_context(req))
        rows.append({
            "scenario_id": sc["scenario_id"], "intent": req.intent.value, "status": req.status.value,
            "n_slots": len(req.available_slots), "source": result.source,
            "fallback_reason": result.fallback_reason or "",
            "fictitious_slot": "YA" if hallucination and hallucination.startswith("UNKNOWN") else "TIDAK",
            "draft_text": result.draft_text,
            "skor_ketepatan_slot": "", "skor_kesesuaian_intent": "", "skor_kejelasan": "", "skor_kesopanan": "",
        })
        print(f"[{n + 1}/{len(scenarios)}] {sc['scenario_id']} {req.intent.value}/{req.status.value} "
              f"-> {result.source} {result.fallback_reason or ''}")
        if settings.llm_enabled and n < len(scenarios) - 1:
            time.sleep(args.delay)

    out = ROOT / "reports" / "draft_scenarios.csv"
    with out.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    llm_count = sum(r["source"] == "LLM" for r in rows)
    fictitious = sum(r["fictitious_slot"] == "YA" for r in rows)
    print(f"\n{len(rows)} skenario | LLM: {llm_count} | TEMPLATE: {len(rows) - llm_count} | slot fiktif: {fictitious}")
    print(f"Hasil: {out.relative_to(ROOT)} (isi kolom skor_* secara manual)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
