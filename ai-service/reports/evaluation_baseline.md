# Laporan Evaluasi Intent Classification — baseline

- Model: `tfidf-logreg` versi `tfidf-lr-20261101`
- Dibuat: 2026-11-01 10:14
- Confidence threshold (needs_review): 0.6
- Target plan: macro F1 ≥ 0.85 pada test set

## Ringkasan

| Test set | N | Accuracy | Macro F1 | Prediksi < threshold |
|---|---|---|---|---|
| synthetic_test | 225 | 1.0000 | 1.0000 | 1 |
| manual_test | 100 | 0.9400 | 0.9405 | 12 |

## synthetic_test

### Per kelas

| Intent | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| RESCHEDULE | 1.000 | 1.000 | 1.000 | 45 |
| CANCELLATION | 1.000 | 1.000 | 1.000 | 45 |
| SCHEDULE_INQUIRY | 1.000 | 1.000 | 1.000 | 45 |
| CONFIRMATION | 1.000 | 1.000 | 1.000 | 45 |
| OTHER | 1.000 | 1.000 | 1.000 | 45 |

### Confusion matrix (baris = label asli, kolom = prediksi)

| | RESCHEDULE | CANCELLATION | SCHEDULE_INQUIRY | CONFIRMATION | OTHER |
|---|---|---|---|---|---|
| **RESCHEDULE** | 45 | 0 | 0 | 0 | 0 |
| **CANCELLATION** | 0 | 45 | 0 | 0 | 0 |
| **SCHEDULE_INQUIRY** | 0 | 0 | 45 | 0 | 0 |
| **CONFIRMATION** | 0 | 0 | 0 | 45 | 0 |
| **OTHER** | 0 | 0 | 0 | 0 | 45 |

### Salah prediksi (0)

Tidak ada.

## manual_test

### Per kelas

| Intent | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| RESCHEDULE | 0.900 | 0.900 | 0.900 | 20 |
| CANCELLATION | 0.952 | 1.000 | 0.976 | 20 |
| SCHEDULE_INQUIRY | 0.857 | 0.900 | 0.878 | 20 |
| CONFIRMATION | 1.000 | 0.950 | 0.974 | 20 |
| OTHER | 1.000 | 0.950 | 0.974 | 20 |

### Confusion matrix (baris = label asli, kolom = prediksi)

| | RESCHEDULE | CANCELLATION | SCHEDULE_INQUIRY | CONFIRMATION | OTHER |
|---|---|---|---|---|---|
| **RESCHEDULE** | 18 | 1 | 1 | 0 | 0 |
| **CANCELLATION** | 0 | 20 | 0 | 0 | 0 |
| **SCHEDULE_INQUIRY** | 2 | 0 | 18 | 0 | 0 |
| **CONFIRMATION** | 0 | 0 | 1 | 19 | 0 |
| **OTHER** | 0 | 0 | 1 | 0 | 19 |

### Salah prediksi (6)

| Pesan | Label | Prediksi | Confidence |
|---|---|---|---|
| min, coach dimas hari ini aku ga dapet ijin kantor. ada slot pengganti jumat malem? | RESCHEDULE | SCHEDULE_INQUIRY | 0.90 |
| lusa aku keluar kota, sesinya ganti minggu depan aja ya kak | RESCHEDULE | CANCELLATION | 0.43 |
| Kak boleh minta list jadwal zumba bulan depan? | SCHEDULE_INQUIRY | RESCHEDULE | 0.49 |
| kak sesi aku yg kemarin dipindah itu jadinya hari apa ya? | SCHEDULE_INQUIRY | RESCHEDULE | 0.44 |
| boleh kak yg slot pertama aja | CONFIRMATION | SCHEDULE_INQUIRY | 0.81 |
| kak di sana ada kolam renang ga | OTHER | SCHEDULE_INQUIRY | 0.51 |
