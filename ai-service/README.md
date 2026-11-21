# AI Service — Smart Reschedule Assistant Gymnasyum

Service Python (FastAPI) terpisah dari Web. Isinya intent classification (5 kelas), ekstraksi preferensi
jadwal, dan draft respons GenAI (Gemini + guardrail + fallback template).
Service ini tidak mengakses database Web: semua data jadwal/slot dikirim Backend per request.

```
Pesan customer → preprocessing → klasifikasi intent (+confidence) → ekstraksi preferensi
  → [Backend filter slot dari DB] → admin pilih slot & approve/reject → draft respons → admin edit & kirim
```

## Struktur

```
app/
  main.py           FastAPI: /health, /api/v1/analyze, /api/v1/classify, /api/v1/draft-response
  schemas.py        Skema Pydantic (field mengikuti API contract Web)
  preprocessing.py  Normalisasi teks (dipakai training & inference)
  classifier.py     TF-IDF+LR (default) / IndoBERT
  extraction.py     Ekstraksi preferensi jadwal rule-based + fallback LLM
  drafting.py       Draft respons: LLM + guardrail + template
  prompts.py        Prompt LLM (berversi)
  llm.py            Client Gemini REST (timeout, retry terbatas)
scripts/
  download_lexicon.py      Unduh Colloquial Indonesian Lexicon
  generate_dataset.py      Dataset synthetic 5 intent + split 70/15/15
  train_baseline.py        Training TF-IDF + Logistic Regression + evaluasi
  train_indobert.py        Fine-tuning IndoBERT (Colab GPU)
  evaluate.py              Accuracy, macro F1, confusion matrix, error analysis
  eval_draft_scenarios.py  25 skenario draft GenAI + cek slot fiktif + kolom rubrik
data/                      Dataset (lihat docs/DATASET_CARD.md)
models/intent_tfidf_lr.joblib   Model baseline terlatih
reports/                   Laporan evaluasi
tests/                     pytest (offline, tanpa Gemini)
```

## Menjalankan lokal

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python scripts/download_lexicon.py
cp .env.example .env                                     # isi GEMINI_API_KEY jika ingin draft LLM
uvicorn app.main:app --reload --port 8000 --env-file .env
```

Buka http://localhost:8000/docs untuk mencoba endpoint lewat Swagger UI.

Tanpa `GEMINI_API_KEY` service tetap berjalan: draft memakai template dan ekstraksi tidak memakai fallback LLM.

## Training & evaluasi

```bash
python scripts/generate_dataset.py --per-intent 300 --seed 42
python scripts/train_baseline.py          # simpan models/intent_tfidf_lr.joblib + reports/evaluation_baseline.md
python -m pytest -q
python scripts/eval_draft_scenarios.py    # pakai Gemini jika key ada; jeda 13 dtk/skenario (free tier 5 RPM)
```

IndoBERT (Colab GPU): lihat docstring `scripts/train_indobert.py`, lalu jalankan service dengan
`INTENT_MODEL_TYPE=indobert INTENT_MODEL_PATH=models/indobert-intent`.

### Hasil baseline saat ini (TF-IDF + LR, `reports/evaluation_baseline.md`)

| Test set | N | Accuracy | Macro F1 |
|---|---|---|---|
| synthetic test | 225 | 1.000 | 1.000 |
| manual test | 100 | 0.940 | 0.941 |

Skor synthetic terlalu optimistis karena berasal dari template yang sama. Pakai skor manual test sebagai acuan
(target plan ≥ 0.85), dan baca bagian keterbatasan di `docs/DATASET_CARD.md`.

## Deploy (Hugging Face Spaces — Docker)

1. Buat Space baru dengan SDK **Docker**, lalu push isi folder `ai-service/` ke Space tersebut.
2. Di Settings → Variables and secrets, isi `GEMINI_API_KEY` dan `AI_SERVICE_API_KEY` (secret).
3. Service berjalan di port 7860. Backend memakai `AI_SERVICE_URL=https://<user>-<space>.hf.space`.

Build lokal: `docker build -t gymnasyum-ai . && docker run -p 7860:7860 --env-file .env gymnasyum-ai`

## Dokumen terkait

- `../docs/AI_API_CONTRACT.md` — kontrak endpoint + contoh JSON
- `../docs/PROMPTS.md` — prompt, guardrail, riwayat versi
- `../docs/DATASET_CARD.md` — dataset & pedoman labeling
- `../integration/backend/` — client Node.js untuk Backend Express + usulan kolom DB
