# Smart Reschedule Assistant — Gymnasyum

Capstone DB15-G001. Aplikasi web untuk membantu admin Gymnasyum mengelola request reschedule customer,
dengan AI Service untuk memahami pesan customer dan menyiapkan draft balasan. Keputusan akhir tetap di tangan admin.

| Folder | Isi | PIC |
|---|---|---|
| `ai-service/` | AI Service (FastAPI): intent classification, ekstraksi preferensi jadwal, draft respons GenAI | Gen AI |
| `integration/backend/` | Client Node.js untuk Backend Express + panduan integrasi | Gen AI ↔ Full-Stack |
| `docs/` | API contract AI, dokumentasi prompt, dataset card | Gen AI |

Frontend (React) dan Backend (Express + PostgreSQL) dikerjakan tim Full-Stack.

Mulai dari [`ai-service/README.md`](ai-service/README.md).
