"""Fine-tuning IndoBERT untuk intent classification (model utama sesuai plan).

Disarankan dijalankan di Google Colab (GPU):
    !git clone <repo> && cd smart-reschedule-assistant/ai-service
    !pip install -r requirements-indobert.txt
    !python scripts/download_lexicon.py
    !python scripts/train_indobert.py --epochs 4
    !python scripts/evaluate.py --model-type indobert --model-path models/indobert-intent --name indobert

Model disimpan di models/indobert-intent/ (tidak masuk git; unggah ke Hugging Face Hub).
Untuk dipakai API: INTENT_MODEL_TYPE=indobert INTENT_MODEL_PATH=models/indobert-intent
"""
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.classifier import INTENT_LABELS  # noqa: E402
from app.preprocessing import lexicon_loaded, preprocess  # noqa: E402

OUT_DIR = ROOT / "models" / "indobert-intent"


def main() -> int:
    import torch
    from sklearn.metrics import f1_score
    from transformers import (AutoModelForSequenceClassification, AutoTokenizer, DataCollatorWithPadding, Trainer,
                              TrainingArguments)

    parser = argparse.ArgumentParser()
    parser.add_argument("--base-model", default="indobenchmark/indobert-base-p1")
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--lr", type=float, default=3e-5)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    label2id = {label: i for i, label in enumerate(INTENT_LABELS)}
    tokenizer = AutoTokenizer.from_pretrained(args.base_model)

    class IntentDataset(torch.utils.data.Dataset):
        def __init__(self, df: pd.DataFrame):
            self.enc = tokenizer([preprocess(t) for t in df["message_text"]], truncation=True, max_length=128)
            self.labels = [label2id[x] for x in df["intent"]]

        def __len__(self):
            return len(self.labels)

        def __getitem__(self, i):
            item = {k: v[i] for k, v in self.enc.items()}
            item["labels"] = self.labels[i]
            return item

    data_dir = ROOT / "data" / "processed"
    train_ds = IntentDataset(pd.read_csv(data_dir / "train.csv"))
    val_ds = IntentDataset(pd.read_csv(data_dir / "val.csv"))

    model = AutoModelForSequenceClassification.from_pretrained(
        args.base_model, num_labels=len(INTENT_LABELS), label2id=label2id,
        id2label={i: label for label, i in label2id.items()},
    )

    def compute_metrics(pred):
        y_pred = np.argmax(pred.predictions, axis=-1)
        return {"macro_f1": f1_score(pred.label_ids, y_pred, average="macro")}

    training_args = TrainingArguments(
        output_dir=str(ROOT / "models" / "indobert-checkpoints"),
        num_train_epochs=args.epochs, learning_rate=args.lr, per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=32, weight_decay=0.01, warmup_ratio=0.1, eval_strategy="epoch",
        save_strategy="epoch", load_best_model_at_end=True, metric_for_best_model="macro_f1",
        save_total_limit=1, seed=args.seed, report_to="none",
    )
    trainer = Trainer(model=model, args=training_args, train_dataset=train_ds, eval_dataset=val_ds,
                      data_collator=DataCollatorWithPadding(tokenizer), compute_metrics=compute_metrics)
    trainer.train()
    metrics = trainer.evaluate()
    print(f"Validation: {metrics}")

    trainer.save_model(OUT_DIR)
    tokenizer.save_pretrained(OUT_DIR)
    (OUT_DIR / "model_meta.json").write_text(json.dumps({
        "model_version": datetime.now().strftime("indobert-%Y%m%d"),
        "base_model": args.base_model,
        "uses_lexicon": lexicon_loaded(),
        "val_macro_f1": round(metrics.get("eval_macro_f1", 0.0), 4),
    }, indent=2))
    print(f"Model tersimpan: {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
