# API Contract — AI Service (draft v0.1)

Melengkapi Tabel B.3 dan "Rancangan API Contract Full-Stack Web" di project plan.
Dokumentasi interaktif: `GET /docs` (Swagger UI) dan `GET /openapi.json`.

## Standar (sama dengan Web)

| Hal | Format |
|---|---|
| Nama field | `snake_case` |
| Tanggal | `YYYY-MM-DD` |
| Jam | `HH:MM` (24 jam) |
| Timestamp pesan | ISO 8601. Tanpa zona waktu dianggap WIB (`+07:00`). Response selalu dinormalisasi ke WIB |
| Status request | `PENDING` / `APPROVED` / `REJECTED` |
| Intent | `RESCHEDULE` / `CANCELLATION` / `SCHEDULE_INQUIRY` / `CONFIRMATION` / `OTHER` |
| Sukses | `{"data": ...}` |
| Error | `{"error": {"code": "...", "message": "..."}}` |
| HTTP status | 200, 400 (`VALIDATION_ERROR`), 401 (`UNAUTHORIZED`), 404 (`NOT_FOUND`), 500 (`INTERNAL_ERROR`) |
| Auth (opsional) | Header `X-API-Key` jika `AI_SERVICE_API_KEY` diisi di AI Service |

Objek `schedule` dan `available_slots` pada `draft-response` sengaja memakai bentuk yang sama dengan
response `GET /api/schedules/:id` dan `GET /api/available-slots`, jadi Backend bisa meneruskannya apa adanya
(field tambahan seperti `status` diabaikan).

---

## GET /health

```json
{
  "data": {
    "status": "ok",
    "service_version": "0.1.0",
    "model_name": "tfidf-logreg",
    "model_version": "tfidf-lr-20261101",
    "lexicon_loaded": true,
    "llm_enabled": true,
    "prompt_version": "draft-v2"
  }
}
```

## POST /api/v1/analyze

Dipanggil Backend saat `POST /api/reschedule-requests` dibuat.

Request:
```json
{
  "message_text": "Besok sore nggak bisa, pindah Sabtu pagi dong",
  "message_timestamp": "2026-10-09T19:00:00+07:00"
}
```

Response 200:
```json
{
  "data": {
    "intent": "RESCHEDULE",
    "confidence": 0.9881,
    "needs_review": false,
    "review_reasons": [],
    "preference": {
      "requested_date": "2026-10-10",
      "requested_time": null,
      "day_name": "Sabtu",
      "time_of_day": "pagi",
      "date_from": "2026-10-10",
      "date_to": "2026-10-10",
      "start_time": "06:00",
      "end_time": "11:00",
      "is_ambiguous": false,
      "source": "RULE"
    },
    "message_timestamp": "2026-10-09T19:00:00+07:00",
    "model_version": "tfidf-lr-20261101"
  }
}
```

| Field | Keterangan |
|---|---|
| `needs_review` | `true` jika `review_reasons` tidak kosong → UI menandai "perlu review admin" |
| `review_reasons` | `LOW_CONFIDENCE` (confidence < 0.6), `PREFERENCE_NOT_FOUND` (intent RESCHEDULE tapi tidak ada tanggal/jam), `AMBIGUOUS_PREFERENCE` |
| `preference.requested_date/requested_time` | Bisa langsung mengisi `requested_date`/`requested_time` request Web jika form kosong |
| `preference.date_from/date_to` | Filter tanggal slot (inklusif). Terisi juga untuk "minggu depan" walau `requested_date` null |
| `preference.start_time/end_time` | Filter jam slot: `start_time <= slot.start_time < end_time` |
| `preference.source` | `RULE` (parser), `LLM` (fallback Gemini), `NONE` (tidak ditemukan) |

## POST /api/v1/classify

Untuk pengujian model.

Request: `{"message_text": "Kak, paket private coaching berapa ya?"}`

Response 200:
```json
{
  "data": {
    "intent": "OTHER",
    "confidence": 0.93,
    "needs_review": false,
    "scores": {"CANCELLATION": 0.01, "CONFIRMATION": 0.02, "OTHER": 0.93, "RESCHEDULE": 0.01, "SCHEDULE_INQUIRY": 0.03},
    "model_version": "tfidf-lr-20261101"
  }
}
```

## POST /api/v1/draft-response

Dipanggil saat admin membuka detail request / setelah admin approve atau reject.
Draft **tidak pernah dikirim otomatis**; tampilkan untuk diedit admin.

Request:
```json
{
  "intent": "RESCHEDULE",
  "customer_name": "Budi Santoso",
  "salutation": "Kak",
  "schedule": {"id": 101, "customer_name": "Budi Santoso", "class_name": "Personal Training", "date": "2026-10-15", "time": "09:00"},
  "preference": {"requested_date": "2026-10-17", "time_of_day": "pagi"},
  "available_slots": [
    {"slot_id": 701, "date": "2026-10-17", "start_time": "08:00", "end_time": "09:00", "available": true}
  ],
  "status": "APPROVED",
  "approved_date": "2026-10-17",
  "approved_time": "08:00",
  "message_text": "Besok sore nggak bisa, pindah Sabtu pagi dong"
}
```

| Field | Wajib | Keterangan |
|---|---|---|
| `intent` | ya | Dari hasil `analyze` (boleh dikoreksi admin) |
| `customer_name` | tidak | Default `schedule.customer_name`. Hanya kata pertama yang dipakai (privasi) |
| `salutation` | tidak | `Kak` (default) / `Bapak` / `Ibu` |
| `schedule` | tidak | Jadwal awal |
| `available_slots` | tidak | Maks 20; hanya `available: true` yang disebut, maks 5 di draft |
| `status` | tidak | Keputusan admin, default `PENDING` |
| `approved_date`, `approved_time` | jika `status=APPROVED` dan `intent=RESCHEDULE` | Slot yang disetujui admin |

Response 200:
```json
{
  "data": {
    "draft_text": "Halo Kak Budi, permintaan pindah jadwal Personal Training Kak Budi sudah kami setujui ya. Jadwal barunya di hari Sabtu, 17 Oktober 2026 pukul 08:00. Sampai jumpa di gym! 😊",
    "mentioned_slots": [{"slot_id": 701, "date": "2026-10-17", "start_time": "08:00"}],
    "source": "LLM",
    "fallback_reason": null,
    "prompt_version": "draft-v2"
  }
}
```

`source = "TEMPLATE"` jika LLM nonaktif/gagal/kuota habis (`fallback_reason: "LLM_UNAVAILABLE"`) atau draft LLM
melanggar guardrail (`fallback_reason: "GUARDRAIL:UNKNOWN_TIME:14:00"`, dst.).

## Contoh error

```json
{"error": {"code": "VALIDATION_ERROR", "message": "message_text: String should have at least 1 character"}}
{"error": {"code": "VALIDATION_ERROR", "message": "approved_date dan approved_time wajib diisi jika status APPROVED untuk RESCHEDULE"}}
{"error": {"code": "UNAUTHORIZED", "message": "Header X-API-Key tidak valid"}}
```

## Hal yang masih perlu disepakati dengan tim Fullstack

- Apakah `message_text`/`message_timestamp` masuk body `POST /api/reschedule-requests` (usulan: ya).
- Approval mengacu ke `approved_date`+`approved_time` atau `slot_id` (AI Service menerima keduanya lewat `available_slots`).
- Kolom penyimpanan hasil AI — usulan ada di `integration/backend/README.md`.
