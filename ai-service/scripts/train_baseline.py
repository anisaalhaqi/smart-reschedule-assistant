"""Training baseline intent classification: TF-IDF (word + char n-gram) + Logistic Regression.

Hyperparameter C dipilih berdasarkan macro F1 pada validation set, lalu model
dilatih ulang pada train+val dan dievaluasi pada test set (synthetic + manual).

Pemakaian:
    python scripts/train_baseline.py
"""
import sys
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.classifier import TfidfIntentClassifier  # noqa: E402
from app.config import settings  # noqa: E402
from app.preprocessing import lexicon_loaded, preprocess  # noqa: E402
from scripts.evaluate import run as run_evaluation  # noqa: E402

MODEL_PATH = ROOT / "models" / "intent_tfidf_lr.joblib"
C_GRID = [0.5, 1.0, 2.0, 5.0, 10.0, 20.0]


def build_pipeline(c: float) -> Pipeline:
    features = FeatureUnion([
        # token_pattern \S+ supaya "?" dan jam "08:00" tetap menjadi token
        ("word", TfidfVectorizer(ngram_range=(1, 2), token_pattern=r"\S+", sublinear_tf=True, min_df=1)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True, min_df=2)),
    ])
    clf = LogisticRegression(C=c, max_iter=3000, class_weight="balanced")
    return Pipeline([("features", features), ("clf", clf)])


def main() -> int:
    if not lexicon_loaded():
        print("PERINGATAN: lexicon belum diunduh, preprocessing hanya memakai kamus domain. "
              "Jalankan scripts/download_lexicon.py agar sama dengan deployment.")

    data_dir = ROOT / "data" / "processed"
    train = pd.read_csv(data_dir / "train.csv")
    val = pd.read_csv(data_dir / "val.csv")
    x_train, x_val = [preprocess(t) for t in train["message_text"]], [preprocess(t) for t in val["message_text"]]

    best_c, best_f1 = None, -1.0
    for c in C_GRID:
        pipe = build_pipeline(c).fit(x_train, train["intent"])
        f1 = f1_score(val["intent"], pipe.predict(x_val), average="macro")
        print(f"C={c:<5} val macro F1={f1:.4f}")
        if f1 > best_f1:
            best_c, best_f1 = c, f1
    print(f"C terbaik = {best_c} (val macro F1 {best_f1:.4f})")

    final = build_pipeline(best_c).fit(x_train + x_val, pd.concat([train["intent"], val["intent"]]))
    version = datetime.now().strftime("tfidf-lr-%Y%m%d")
    joblib.dump({
        "pipeline": final,
        "model_version": version,
        "uses_lexicon": lexicon_loaded(),
        "best_c": best_c,
        "val_macro_f1": round(best_f1, 4),
    }, MODEL_PATH)
    print(f"Model tersimpan: {MODEL_PATH.relative_to(ROOT)}")

    run_evaluation(TfidfIntentClassifier(MODEL_PATH), "baseline", settings.confidence_threshold)
    return 0


if __name__ == "__main__":
    sys.exit(main())
