# Integrasi Backend (Express) ↔ AI Service

File `aiServiceClient.js` siap disalin ke backend. Nama field sama dengan API contract Web
(`schedule_id`, `customer_name`, `class_name`, `requested_date`, `requested_time`, `slot_id`,
`start_time`, `end_time`, `status`, `approved_date`, `approved_time`, `message_text`, `message_timestamp`).

## 1. Env backend

```env
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=
AI_SERVICE_TIMEOUT_MS=10000
```

## 2. Kolom tambahan yang disarankan di tabel `reschedule_requests` (PostgreSQL)

Supaya hasil AI tersimpan dan bisa ditampilkan di halaman request/approval admin:

```sql
ALTER TABLE reschedule_requests
  ADD COLUMN message_text       TEXT,
  ADD COLUMN message_timestamp  TIMESTAMPTZ,
  ADD COLUMN ai_intent          VARCHAR(20),     -- RESCHEDULE | CANCELLATION | SCHEDULE_INQUIRY | CONFIRMATION | OTHER
  ADD COLUMN ai_confidence      NUMERIC(5,4),
  ADD COLUMN ai_needs_review    BOOLEAN,
  ADD COLUMN ai_review_reasons  JSONB,           -- ["LOW_CONFIDENCE", ...]
  ADD COLUMN ai_preference      JSONB,           -- objek preference dari /api/v1/analyze
  ADD COLUMN ai_draft_text      TEXT,
  ADD COLUMN ai_draft_source    VARCHAR(10);     -- LLM | TEMPLATE
```

Semua kolom `ai_*` boleh `NULL`: kalau AI Service mati, request tetap tersimpan.

## 3. Alur pemanggilan

```js
const ai = require('../services/aiServiceClient');

// POST /api/reschedule-requests
async function createRescheduleRequest(req, res) {
  const { schedule_id, requested_date, requested_time, reason, message_text, message_timestamp } = req.body;
  // ... validasi + cek schedule ada (404 jika tidak) ...

  let aiFields = {};
  if (message_text) {
    const result = await ai.analyzeMessage({ message_text, message_timestamp });
    if (result.ok) {
      const { intent, confidence, needs_review, review_reasons, preference } = result.data;
      aiFields = {
        ai_intent: intent, ai_confidence: confidence, ai_needs_review: needs_review,
        ai_review_reasons: review_reasons, ai_preference: preference,
      };
    } else {
      console.warn('AI analyze gagal, lanjut tanpa AI:', result.error);
    }
  }

  // requested_date/requested_time dari form tetap prioritas; jika kosong boleh diisi dari AI
  const row = await db.insertRescheduleRequest({
    schedule_id,
    requested_date: requested_date ?? aiFields.ai_preference?.requested_date ?? null,
    requested_time: requested_time ?? aiFields.ai_preference?.requested_time ?? null,
    reason, message_text, message_timestamp, status: 'PENDING', ...aiFields,
  });
  return res.status(201).json({ data: row });
}

// Halaman detail request admin: slot yang cocok dengan preferensi customer
async function getSuggestedSlots(request) {
  const slots = await db.getAvailableSlots({ date_from: request.ai_preference?.date_from, date_to: request.ai_preference?.date_to });
  return ai.filterSlotsByPreference(slots, request.ai_preference);
}

// Setelah admin approve/reject (PATCH /api/reschedule-requests/:id) atau saat admin klik "Buat draft"
async function buildDraft(request, schedule, slots) {
  const result = await ai.draftResponse({
    intent: request.ai_intent || 'RESCHEDULE',
    schedule,                                  // { id, customer_name, class_name, date, time }
    preference: request.ai_preference,
    available_slots: slots,                    // { slot_id, date, start_time, end_time, available }
    status: request.status,                    // PENDING | APPROVED | REJECTED
    approved_date: request.approved_date,
    approved_time: request.approved_time,
    message_text: request.message_text,
  });
  // Draft TIDAK dikirim otomatis: tampilkan di textarea agar admin bisa edit lalu kirim
  return result.ok ? result.data : null;
}
```

## 4. Perilaku saat AI gagal

| Kondisi | `error.code` dari client | Yang dilakukan Backend/UI |
|---|---|---|
| AI Service mati | `AI_SERVICE_UNAVAILABLE` | Simpan request tanpa kolom `ai_*`; UI tampilkan "Analisis AI tidak tersedia" |
| Timeout | `AI_SERVICE_TIMEOUT` | Sama seperti di atas |
| Input salah | `VALIDATION_ERROR` (400) | Log; periksa payload |
| Gemini kuota habis | — (tetap `ok: true`) | Draft otomatis memakai template, `source: "TEMPLATE"` |
