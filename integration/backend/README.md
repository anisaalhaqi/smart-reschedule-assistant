# Integrasi Backend dengan AI Service

Backend Express memakai `aiServiceClient.js`, yang memanggil FastAPI melalui HTTP. Atur
`AI_SERVICE_URL`, `AI_SERVICE_API_KEY` dan `AI_SERVICE_TIMEOUT_MS` di `backend/.env`.
Jika AI Service memakai API key, kedua service harus memiliki nilai yang sama. Nilai tersebut
disimpan di server.

## Alur peninjauan admin

1. Customer membuat request lewat `POST /api/reschedule-requests` dengan ID jadwal, ID slot tujuan
   dan pesan bebas di field `reason`. Backend menyimpan waktu pengajuan di `created_at`.
2. Admin memilih **Analisis & buat draft**. Browser memanggil
   `POST /api/reschedule-requests/:id/ai-review` dengan JWT admin. Backend mengirim pesan yang
   tersimpan dan waktu pengajuannya ke `POST /api/v1/analyze`.
3. Backend membaca jadwal dan slot dari PostgreSQL. Slot alternatif harus masih tersedia dan
   cocok dengan hasil ekstraksi. Jika preferensi kosong atau ambigu, admin tetap bisa
   memproses slot awal yang diajukan customer.
4. Backend mengirim intent, konteks jadwal dan daftar slot ke `POST /api/v1/draft-response`.
   Respons review berisi `data.analysis`, `data.slots`, `data.draft` dan `data.error`.
   Jika pesan terdeteksi sebagai pembatalan dan permintaan pindah belum disetujui, respons
   menyertakan `data.manual_review: "CANCELLATION"` dengan `slots: []` dan `draft: null`.
   Untuk permintaan yang masih pending, backend menyimpan flag `ai_cancellation_review`
   sehingga penanda terlihat lagi setelah reload dan tetap berlaku ketika AI Service offline.
   Admin perlu memverifikasi maksud customer. Approval yang tersedia di API ini memindahkan jadwal.
   Pembatalan sesi ditangani secara manual.
   Ketika AI gagal, `data.error` berisi kode kegagalan dan admin masih bisa membuat draft sendiri.
5. Keputusan admin menggunakan `PATCH /api/reschedule-requests/:id` dengan `status` dan
   `available_slot_id` opsional saat `APPROVED`. Jika flag cancellation aktif, approval wajib
   menyertakan `confirm_reschedule: true`. Jika belum dikonfirmasi, backend mengembalikan HTTP 409.
   Penolakan request tetap dapat dilakukan. Backend mengecek ulang slot dalam transaksi.
   Admin dapat membuat draft baru setelah persetujuan agar balasan merujuk slot final.

Request review dijalankan saat admin membutuhkannya, termasuk untuk request yang tersimpan
sebelum integrasi. Hasil AI dan edit draft berada di layar review. Salin draft sebelum
meninggalkan request. Aplikasi tidak memiliki pengiriman pesan otomatis.

[Kontrak FastAPI](../../docs/AI_API_CONTRACT.md) · [Panduan menjalankan aplikasi](../../README.md)

Jalankan migrasi SQL `004_reschedule_ai_review.sql` sebelum menjalankan versi backend ini pada database yang sudah ada.
Tes integrasi HTTP dapat diulang dengan `npm --prefix backend test` dari root repo.
