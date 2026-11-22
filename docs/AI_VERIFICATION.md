# Verifikasi AI Service dan integrasi Web

## Klasifikasi intent

| Model | Macro F1 validasi (225) | Macro F1 sintetis (225) | Akurasi manual (100) | Macro F1 manual (100) |
|---|---:|---:|---:|---:|
| TF-IDF + Logistic Regression | 1,0000 | 1,0000 | 0,9400 | 0,9405 |
| IndoBERT | 0,9956 | 1,0000 | 0,9700 | 0,9697 |

Model default dipilih berdasarkan macro F1 validasi sesuai project plan. Skor pada set manual
dilaporkan sebagai pengujian terpisah. Skenario sintetis dari template dapat menghasilkan skor tinggi.
Confusion matrix dan prediksi yang keliru tersedia di
[laporan TF-IDF](../ai-service/reports/evaluation_baseline.md) dan
[laporan IndoBERT](../ai-service/reports/evaluation_indobert.md).

Eksperimen IndoBERT memakai `indobenchmark/indobert-base-p1` pada revisi
`c2cd0b51ddce6580eb35263b39b0a1e5fb0a39e2`, seed 42, batch 16, dua epoch dan learning
rate 0,0001. Embedding dan 10 layer awal dibekukan untuk CPU. Checkpoint besar dihasilkan lokal
oleh skrip dan diabaikan Git.

```bash
cd ai-service
pip install -r requirements-indobert.txt
python scripts/train_indobert.py --epochs 2 --freeze-layers 10 --lr 0.0001
python scripts/evaluate.py --model-type indobert --model-path models/indobert-intent --name indobert
```

## Ekstraksi dan draft

- Parser rule-based cocok pada 25 dari 25 pesan sintetis pada
  [sampel pengembangan](../ai-service/data/raw/preference_test.csv). Exact match menilai tanggal,
  jam, bagian hari dan rentang tanggal sekaligus. Kasus ISO diperbaiki setelah evaluasi awal
  24 dari 25. Pengujian dapat diulang dengan `python scripts/evaluate_preference.py`.
- [Evaluasi draft fallback](../ai-service/reports/draft_scenarios.csv) mencakup 25 skenario dan
  menemukan 0 slot fiktif pada pengecekan otomatis. Penilaian awal isi template oleh asisten
  menggunakan skala 1–5. Nilai 4 untuk intent menandai respons yang meminta tindak lanjut
  umum, sedangkan nilai 4 untuk kejelasan menandai kalimat panjang atau daftar tiga opsi.
- Pengujian Gemini memakai respons HTTP tiruan. Ia memeriksa penggunaan REST API,
  pemetaan slot dalam output, dan penolakan pasangan tanggal/jam yang tidak ada. Untuk mengevaluasi
  output live, jalankan ini dari `ai-service` dengan key di file `.env` dan tinjau hasilnya secara manual.

```bash
python -m dotenv run -- python scripts/eval_draft_scenarios.py --output reports/draft_gemini.csv
```

## Integrasi

Uji dengan React di Chromium, Express, PostgreSQL, dan FastAPI lokal. Skenario mencakup login
customer dan admin, pengajuan pesan bebas, otorisasi admin, filter slot pagi, persetujuan alternatif,
pembuatan ulang draft berdasarkan slot final, dan edit draft. Uji API terpisah memastikan admin
tetap bisa memutuskan permintaan ketika AI Service tidak tersedia.

Endpoint `/docs` tersedia lewat FastAPI. Deployment publik dan uji Gemini live
memerlukan host serta `GEMINI_API_KEY` tim.
