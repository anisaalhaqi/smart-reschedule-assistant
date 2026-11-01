"""Evaluasi model intent classification pada test set.

Metrik: accuracy, precision/recall/F1 per kelas, macro F1, confusion matrix,
dan daftar salah prediksi untuk error analysis. Bisa dipakai untuk model
TF-IDF maupun IndoBERT.

Pemakaian:
    python scripts/evaluate.py                                    # model default (.env / config)
    python scripts/evaluate.py --model-type indobert --model-path models/indobert-intent --name indobert
"""
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.classifier import INTENT_LABELS, load_classifier  # noqa: E402
from app.config import settings  # noqa: E402

TEST_SETS = {
    "synthetic_test": ROOT / "data" / "processed" / "test.csv",
    "manual_test": ROOT / "data" / "raw" / "manual_test.csv",
}


def evaluate_split(classifier, df: pd.DataFrame, threshold: float) -> dict:
    preds = classifier.predict_batch(df["message_text"].tolist())
    y_true = df["intent"].tolist()
    y_pred = [p.intent for p in preds]
    report = classification_report(y_true, y_pred, labels=INTENT_LABELS, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_true, y_pred, labels=INTENT_LABELS)
    errors = [
        {"message_text": t, "true": yt, "pred": p.intent, "confidence": p.confidence}
        for t, yt, p in zip(df["message_text"], y_true, preds) if yt != p.intent
    ]
    low_conf = sum(p.confidence < threshold for p in preds)
    return {
        "n": len(df),
        "accuracy": round(accuracy_score(y_true, y_pred), 4),
        "macro_f1": round(f1_score(y_true, y_pred, labels=INTENT_LABELS, average="macro", zero_division=0), 4),
        "per_class": {k: {m: round(v, 4) for m, v in report[k].items()} for k in INTENT_LABELS},
        "confusion_matrix": cm.tolist(),
        "needs_review_count": int(low_conf),
        "errors": errors,
    }


def to_markdown(name: str, model_info: dict, results: dict, threshold: float) -> str:
    lines = [
        f"# Laporan Evaluasi Intent Classification — {name}",
        "",
        f"- Model: `{model_info['model_name']}` versi `{model_info['model_version']}`",
        f"- Dibuat: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"- Confidence threshold (needs_review): {threshold}",
        f"- Target plan: macro F1 ≥ 0.85 pada test set",
        "",
        "## Ringkasan",
        "",
        "| Test set | N | Accuracy | Macro F1 | Prediksi < threshold |",
        "|---|---|---|---|---|",
    ]
    for split, r in results.items():
        lines.append(f"| {split} | {r['n']} | {r['accuracy']:.4f} | {r['macro_f1']:.4f} | {r['needs_review_count']} |")
    for split, r in results.items():
        lines += ["", f"## {split}", "", "### Per kelas", "",
                  "| Intent | Precision | Recall | F1 | Support |", "|---|---|---|---|---|"]
        for label in INTENT_LABELS:
            c = r["per_class"][label]
            lines.append(f"| {label} | {c['precision']:.3f} | {c['recall']:.3f} | {c['f1-score']:.3f} | "
                         f"{int(c['support'])} |")
        lines += ["", "### Confusion matrix (baris = label asli, kolom = prediksi)", "",
                  "| | " + " | ".join(INTENT_LABELS) + " |", "|---" * (len(INTENT_LABELS) + 1) + "|"]
        for label, row in zip(INTENT_LABELS, r["confusion_matrix"]):
            lines.append(f"| **{label}** | " + " | ".join(str(v) for v in row) + " |")
        lines += ["", f"### Salah prediksi ({len(r['errors'])})", ""]
        if r["errors"]:
            lines += ["| Pesan | Label | Prediksi | Confidence |", "|---|---|---|---|"]
            for e in r["errors"][:40]:
                msg = e["message_text"].replace("|", "/")
                lines.append(f"| {msg} | {e['true']} | {e['pred']} | {e['confidence']:.2f} |")
        else:
            lines.append("Tidak ada.")
    return "\n".join(lines) + "\n"


def run(classifier, name: str, threshold: float) -> dict:
    results = {split: evaluate_split(classifier, pd.read_csv(path), threshold)
               for split, path in TEST_SETS.items() if path.exists()}
    model_info = {"model_name": classifier.model_name, "model_version": classifier.model_version}
    out_dir = ROOT / "reports"
    out_dir.mkdir(exist_ok=True)
    (out_dir / f"evaluation_{name}.json").write_text(
        json.dumps({"model": model_info, "threshold": threshold, "results": results}, indent=2, ensure_ascii=False))
    (out_dir / f"evaluation_{name}.md").write_text(to_markdown(name, model_info, results, threshold))
    for split, r in results.items():
        print(f"{split:15s} n={r['n']:4d} accuracy={r['accuracy']:.4f} macro_f1={r['macro_f1']:.4f}")
    print(f"Laporan: reports/evaluation_{name}.md")
    return results


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-type", default=settings.intent_model_type)
    parser.add_argument("--model-path", type=Path, default=settings.intent_model_path)
    parser.add_argument("--name", default="baseline")
    args = parser.parse_args()
    run(load_classifier(args.model_type, args.model_path), args.name, settings.confidence_threshold)
    return 0


if __name__ == "__main__":
    sys.exit(main())
