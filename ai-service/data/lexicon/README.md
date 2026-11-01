# Kamus normalisasi

File `colloquial-indonesian-lexicon.csv` **tidak** disimpan di git. Unduh dengan:

```bash
python scripts/download_lexicon.py
```

Sumber: *Colloquial Indonesian Lexicon* — Salsabila, N. A., Winatmoko, Y. A., Septiandri, A. A., & Jamal, A. (2018),
IALP 2018. Repo: https://github.com/nasalsabila/kamus-alay

Script hanya menyimpan kolom `slang,formal` (deduplikasi per `slang`). Kamus domain gym
(`DOMAIN_SLANG` di `app/preprocessing.py`) selalu menimpa entri lexicon.
