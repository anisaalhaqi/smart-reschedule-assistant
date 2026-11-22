# Laporan Evaluasi Intent Classification — indobert

- Model: `indobert-intent` versi `indobert-20261121`
- Dibuat: 2026-11-21 12:30
- Confidence threshold (needs_review): 0.6
- Target plan: macro F1 ≥ 0.85 pada test set

## Ringkasan

| Test set | N | Accuracy | Macro F1 | Prediksi < threshold |
|---|---|---|---|---|
| synthetic_test | 225 | 1.0000 | 1.0000 | 0 |
| manual_test | 100 | 0.9700 | 0.9697 | 2 |

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
| RESCHEDULE | 1.000 | 0.900 | 0.947 | 20 |
| CANCELLATION | 0.950 | 0.950 | 0.950 | 20 |
| SCHEDULE_INQUIRY | 0.952 | 1.000 | 0.976 | 20 |
| CONFIRMATION | 0.952 | 1.000 | 0.976 | 20 |
| OTHER | 1.000 | 1.000 | 1.000 | 20 |

### Confusion matrix (baris = label asli, kolom = prediksi)

| | RESCHEDULE | CANCELLATION | SCHEDULE_INQUIRY | CONFIRMATION | OTHER |
|---|---|---|---|---|---|
| **RESCHEDULE** | 18 | 1 | 1 | 0 | 0 |
| **CANCELLATION** | 0 | 19 | 0 | 1 | 0 |
| **SCHEDULE_INQUIRY** | 0 | 0 | 20 | 0 | 0 |
| **CONFIRMATION** | 0 | 0 | 0 | 20 | 0 |
| **OTHER** | 0 | 0 | 0 | 0 | 20 |

### Salah prediksi (3)

| Pesan | Label | Prediksi | Confidence |
|---|---|---|---|
| Bu Ratna izin ganti jadwal yoga ya kak, yang Kamis jadi Jumat sore saja | RESCHEDULE | CANCELLATION | 0.58 |
| min, coach dimas hari ini aku ga dapet ijin kantor. ada slot pengganti jumat malem? | RESCHEDULE | SCHEDULE_INQUIRY | 0.66 |
| cancel kelas body combat jumat ya min, makasih | CANCELLATION | CONFIRMATION | 0.89 |
