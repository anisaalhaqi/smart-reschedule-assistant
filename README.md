# Smart Reschedule Assistant — Gymnasyum

Capstone DB15-G001. Customer mengajukan perubahan jadwal. Admin meninjau pesan, hasil analisis
AI, slot yang tersedia, dan draft balasan sebelum memutuskan jadwal akhir.

```text
src/                  Frontend React untuk customer dan admin
backend/              REST API Express, autentikasi dan PostgreSQL
ai-service/           FastAPI, model intent, ekstraksi WIB dan Gemini
integration/backend/  Client Express untuk AI Service
docs/                 Kontrak API, dokumentasi prompt dan dataset
```

## Jalankan dari CLI

Gunakan Node.js 22.12+ atau 24 dan Python 3.12. Di setiap terminal, mulai dari root repository.

**PostgreSQL.** Buat database lokal untuk proyek ini dan jalankan SQL secara berurutan.
Atur `DATABASE_URL` untuk CLI PostgreSQL dan `DB_*` di `backend/.env` agar menunjuk ke database yang sama.
Gunakan database demo terpisah dari data tim.

```bash
for file in backend/sql/00*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file" || break
done

cd backend
npm ci
cp .env.example .env
# Isi DB_* dan JWT_SECRET di .env
node src/scripts/seed-auth-demo.js
npm start
```

Untuk demo slot alternatif, setelah seeding tambahkan sesi customer dan slot yang masih akan datang.

```sql
INSERT INTO schedules (customer_name, class_name, schedule_date, start_time, end_time, customer_id)
SELECT name, 'Pilates Demo', (now() AT TIME ZONE 'Asia/Jakarta')::date + 1, '15:00', '16:00', id
FROM users WHERE email = 'budi.santoso.demo@example.test';

INSERT INTO available_slots (slot_date, start_time, end_time)
SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date + 1, starts, ends
FROM (VALUES (TIME '08:00', TIME '09:00'), (TIME '09:00', TIME '10:00')) AS demo(starts, ends)
ON CONFLICT (slot_date, start_time) DO NOTHING;
```

**AI Service.** Di terminal kedua, jalankan FastAPI. Isi `GEMINI_API_KEY` di `ai-service/.env`
untuk mengaktifkan Gemini. Mode tanpa key memakai template.

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python scripts/download_lexicon.py
cp .env.example .env
uvicorn app.main:app --port 8000 --env-file .env
```

**Frontend.** Di terminal ketiga, jalankan Vite. Proxy Vite mengarahkan `/api` ke Express port 3000.

```bash
npm ci
npm run dev
```

Pada database yang sudah dipakai, jalankan `backend/sql/004_reschedule_ai_review.sql` sebelum
menjalankan backend versi ini. Tes integrasi HTTP dapat dijalankan dengan `npm --prefix backend test`.

## Coba alur demo

1. Masuk sebagai `budi.santoso.demo@example.test` memakai password dari seed. Pilih kelas Pilates
   Demo dan slot besok pukul 08:00. Ajukan pesan “Kak, sesi hari ini nggak bisa, tolong pindah ke besok pagi ya.”
2. Keluar dan masuk sebagai `admin.gymnasium.demo@example.test`. Pilih request yang baru dibuat,
   lalu klik **Analisis & buat draft**. Tinjau intent, preferensi, alternatif pukul 09:00, dan balasan.
3. Setujui salah satu slot. Klik **Analisis & buat draft** lagi untuk membuat konfirmasi berdasarkan
   slot final. Admin dapat mengedit dan menyalin draft dari kotak teks.
4. Periksa badge **Gemini** atau **Template** untuk melihat sumber draft. API FastAPI tersedia di
   `http://localhost:8000/docs` saat service berjalan.

[AI Service](ai-service/README.md) · [Kontrak AI](docs/AI_API_CONTRACT.md) ·
[Integrasi Backend](integration/backend/README.md) · [Hasil verifikasi](docs/AI_VERIFICATION.md)
