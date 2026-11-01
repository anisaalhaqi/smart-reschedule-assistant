"""Unduh Colloquial Indonesian Lexicon dan simpan versi ringkas (slang,formal).

Pemakaian:
    python scripts/download_lexicon.py
"""
import csv
import io
import sys
import urllib.request
from pathlib import Path

URL = "https://raw.githubusercontent.com/nasalsabila/kamus-alay/master/colloquial-indonesian-lexicon.csv"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "lexicon" / "colloquial-indonesian-lexicon.csv"


def main() -> int:
    print(f"Mengunduh {URL} ...")
    with urllib.request.urlopen(URL, timeout=30) as resp:
        raw = resp.read().decode("utf-8")

    seen: dict[str, str] = {}
    for row in csv.DictReader(io.StringIO(raw)):
        slang = (row.get("slang") or "").strip().lower()
        formal = (row.get("formal") or "").strip().lower()
        if slang and formal and slang not in seen:
            seen[slang] = formal

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["slang", "formal"])
        for slang, formal in sorted(seen.items()):
            writer.writerow([slang, formal])

    print(f"Tersimpan {len(seen)} entri ke {OUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
