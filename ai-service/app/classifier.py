"""Model intent classification (5 kelas) untuk inference.

Dua implementasi dengan antarmuka yang sama:
- TfidfIntentClassifier  : baseline TF-IDF + Logistic Regression (default, ringan)
- IndoBertIntentClassifier: hasil fine-tuning IndoBERT (scripts/train_indobert.py)

Keduanya menerima teks mentah dan menjalankan app.preprocessing.preprocess
sendiri, sama seperti saat training.
"""
import json
import logging
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np

from app.preprocessing import lexicon_loaded, preprocess

logger = logging.getLogger(__name__)

INTENT_LABELS = ["RESCHEDULE", "CANCELLATION", "SCHEDULE_INQUIRY", "CONFIRMATION", "OTHER"]


@dataclass
class IntentPrediction:
    intent: str
    confidence: float
    scores: dict[str, float]


class TfidfIntentClassifier:
    def __init__(self, model_path: Path):
        bundle = joblib.load(model_path)
        self.pipeline = bundle["pipeline"]
        self.labels: list[str] = list(self.pipeline.classes_)
        self.model_name = "tfidf-logreg"
        self.model_version = bundle.get("model_version", "unknown")
        if bundle.get("uses_lexicon") and not lexicon_loaded():
            logger.warning("Model dilatih dengan Colloquial Indonesian Lexicon tetapi file lexicon tidak ditemukan. "
                           "Jalankan: python scripts/download_lexicon.py")

    def predict_batch(self, texts: list[str]) -> list[IntentPrediction]:
        probs = self.pipeline.predict_proba([preprocess(t) for t in texts])
        return [_to_prediction(self.labels, row) for row in probs]

    def predict(self, text: str) -> IntentPrediction:
        return self.predict_batch([text])[0]


class IndoBertIntentClassifier:
    def __init__(self, model_dir: Path):
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        self._torch = torch
        self.tokenizer = AutoTokenizer.from_pretrained(model_dir)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_dir).eval()
        self.labels = [self.model.config.id2label[i] for i in range(self.model.config.num_labels)]
        self.model_name = "indobert-intent"
        meta_path = Path(model_dir) / "model_meta.json"
        meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
        self.model_version = meta.get("model_version", "unknown")

    def predict_batch(self, texts: list[str]) -> list[IntentPrediction]:
        enc = self.tokenizer([preprocess(t) for t in texts], padding=True, truncation=True, max_length=128,
                             return_tensors="pt")
        with self._torch.no_grad():
            probs = self._torch.softmax(self.model(**enc).logits, dim=-1).numpy()
        return [_to_prediction(self.labels, row) for row in probs]

    def predict(self, text: str) -> IntentPrediction:
        return self.predict_batch([text])[0]


def _to_prediction(labels: list[str], probs: np.ndarray) -> IntentPrediction:
    best = int(np.argmax(probs))
    scores = {label: round(float(p), 4) for label, p in zip(labels, probs)}
    return IntentPrediction(intent=labels[best], confidence=round(float(probs[best]), 4), scores=scores)


def load_classifier(model_type: str, model_path: Path):
    if model_type == "indobert":
        return IndoBertIntentClassifier(model_path)
    return TfidfIntentClassifier(model_path)
