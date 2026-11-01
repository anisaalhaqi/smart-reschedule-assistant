# Dataset Card — Pesan Customer Gymnasyum

## Ringkasan

| | |
|---|---|
| File | `ai-service/data/synthetic_messages.csv`, split di `ai-service/data/processed/{train,val,test}.csv` |
| Ukuran | 1.500 pesan, 300 per intent (seimbang) |
| Split | Stratified 70/15/15 → 1.050 / 225 / 225 (seed 42) |
| Test set manual | `ai-service/data/raw/manual_test.csv`, 100 pesan (20 per intent) |
| Bahasa | Indonesia, formal & informal (singkatan, typo, huruf berulang, emoji) |
| Kolom | `id`, `message_text`, `intent`, `source` (`TEMPLATE`/`AUGMENTED`), `style` (`formal`/`santai`) |
| Generator | `python scripts/generate_dataset.py --per-intent 300 --seed 42` |

## Sumber & asumsi

- Data percakapan asli Gymnasyum tidak tersedia, jadi seluruh data dibuat secara synthetic.
- Template seed ditulis manual untuk tiap intent, lalu diisi dengan slot (hari, jam, kelas, alasan,
  nama coach/customer fiktif) dan diaugmentasi (singkatan, typo, huruf berulang, emoji, gaya formal/santai).
- Semua nama fiktif. Nomor telepon/email tidak ada di data, dan preprocessing juga menghapusnya.
- Duplikat dibuang berdasarkan teks hasil preprocessing.

## Keterbatasan (penting untuk laporan)

- **Data template mudah ditebak model.** Skor pada test synthetic (macro F1 1.00) terlalu optimistis.
  Gunakan skor `manual_test` sebagai ukuran generalisasi.
- **`manual_test.csv` saat ini disusun saat bootstrap proyek** dengan phrasing yang sengaja berbeda dari template.
  Agar sesuai plan ("ditulis langsung oleh manusia"), anggota tim sebaiknya mereview, mengganti, dan menambah
  pesan buatan sendiri sebelum evaluasi final. Jangan memakai set ini untuk tuning model.
- Variasi data synthetic belum memakai LLM (rencana plan: perbanyak dengan Gemini). Bisa ditambahkan sebagai
  `source = LLM_GENERATED` lalu direview manual.

## Pedoman labeling (Tabel B.1)

| Intent | Definisi | Contoh |
|---|---|---|
| `RESCHEDULE` | Minta memindahkan jadwal yang sudah ada ke hari/waktu lain | "Besok sore nggak bisa, pindah Sabtu pagi dong" |
| `CANCELLATION` | Membatalkan jadwal **tanpa** meminta pengganti | "Kak, sesi Kamis saya batalkan dulu ya, lagi kurang sehat" |
| `SCHEDULE_INQUIRY` | Menanyakan jadwal/ketersediaan slot, belum meminta perubahan | "Sabtu pagi coach-nya ada slot kosong nggak kak?" |
| `CONFIRMATION` | Mengonfirmasi kehadiran atau menyetujui slot yang ditawarkan | "Oke kak, Sabtu jam 8 aja ya, makasih" |
| `OTHER` | Harga, membership, promo, sapaan, keluhan umum, fasilitas | "Kak, paket private coaching berapa ya?" |

Aturan untuk kasus yang ambigu:
1. Ada pembatalan **dan** permintaan jadwal pengganti → `RESCHEDULE`.
2. Menanyakan slot sambil menyebut ingin pindah ("ada slot Sabtu? mau pindah ke situ") → `RESCHEDULE`.
3. Menyetujui perpindahan yang ditawarkan admin ("oke setuju dipindah ke Senin") → `CONFIRMATION`.
4. Menanyakan jam buka/fasilitas, bukan slot latihan → `OTHER`.
5. Satu pesan hanya satu label: pilih maksud utama yang perlu ditindaklanjuti admin.
