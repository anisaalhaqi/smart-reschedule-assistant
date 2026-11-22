"""Evaluasi exact match parser rule-based pada sampel sintetis terlabel."""
import csv
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.extraction import extract_preference  # noqa: E402

FIELDS = ("requested_date", "requested_time", "time_of_day", "date_from", "date_to")
MESSAGE_TIMESTAMP = datetime.fromisoformat("2026-10-09T19:00:00+07:00")


def main() -> int:
    with (ROOT / "data/raw/preference_test.csv").open(encoding="utf-8", newline="") as sample:
        rows = list(csv.DictReader(sample))

    correct = 0
    for row in rows:
        preference = extract_preference(row["message_text"], MESSAGE_TIMESTAMP)
        differences = [
            f"{field}: {getattr(preference, field)!r} (target {row[field] or None!r})"
            for field in FIELDS
            if getattr(preference, field) != (row[field] or None)
        ]
        if differences:
            print(row["message_text"])
            print("  " + "; ".join(differences))
        else:
            correct += 1

    accuracy = correct / len(rows)
    print(f"Exact match: {correct}/{len(rows)} ({accuracy:.1%})")
    return 0 if accuracy >= 0.85 else 1


if __name__ == "__main__":
    sys.exit(main())
