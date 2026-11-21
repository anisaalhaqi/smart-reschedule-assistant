# Dokumentasi Prompt

Sumber prompt: `ai-service/app/prompts.py`. Setiap perubahan prompt wajib menaikkan `PROMPT_VERSION`
dan dicatat di tabel riwayat di bawah. Versi aktif muncul di `GET /health` dan di setiap response `draft-response`.

## Draft respons (`DRAFT_SYSTEM_PROMPT` + `build_draft_user_prompt`)

- **Tujuan:** draft balasan WhatsApp yang sopan dan hangat untuk segmen ibu-ibu, lansia, dan kalangan menengah ke atas.
- **Model:** Gemini (`GEMINI_MODEL`, default `gemini-2.5-flash`), temperature 0.4, thinking dimatikan.
- **Konteks yang dikirim:** sapaan + nama panggilan, kelas, jadwal awal, pesan customer, keputusan admin,
  jadwal disetujui, dan daftar slot tersedia (maks 5). Nomor telepon dan data sensitif lain tidak dikirim.
- **Instruksi per intent:** `INTENT_INSTRUCTIONS`.

### Guardrail (`app/drafting.py::validate_draft`)

Draft LLM ditolak dan diganti template jika:

| Kode | Arti |
|---|---|
| `UNKNOWN_DATE:<x>` | Menyebut tanggal yang tidak ada di jadwal awal/disetujui/slot |
| `UNKNOWN_DAY:<x>` | Menyebut nama hari yang tidak cocok dengan tanggal mana pun di konteks |
| `UNKNOWN_TIME:<x>` | Menyebut jam yang tidak ada di konteks |
| `APPROVED_SLOT_NOT_MENTIONED` | Status APPROVED tetapi jam yang disetujui tidak disebut |
| `PLACEHOLDER_FOUND` | Ada `[ ]` atau `{ }` (mis. "[nama]") |
| `EMPTY_OR_TOO_LONG` | Kosong atau lebih dari 1.200 karakter |

### Contoh

Input (ringkas): intent `RESCHEDULE`, status `APPROVED`, jadwal awal Kamis 15 Okt 09:00, disetujui Sabtu 17 Okt 08:00.

Output LLM (`draft-v2`):
> Halo Kak Budi, Baik, permintaan pindah jadwal Personal Training Kak Budi sudah kami setujui ya. Jadwal barunya di
> hari Sabtu, 17 Oktober 2026 pukul 08:00. Sampai jumpa di gym! 😊

Output template (fallback):
> Halo Kak Budi, terima kasih sudah mengabari 🙏 Sesi personal training dari Kamis, 15 Oktober 2026 pukul 09:00 sudah
> kami pindahkan ke Sabtu, 17 Oktober 2026 pukul 08:00. Sampai bertemu di Gymnasyum ya, Kak Budi!

## Ekstraksi preferensi — fallback LLM (`EXTRACTION_SYSTEM_PROMPT`)

Dipakai hanya jika parser rule-based tidak menemukan preferensi atau hasilnya ambigu, dan intent-nya
`RESCHEDULE`/`SCHEDULE_INQUIRY`. Output JSON (`responseMimeType: application/json`, temperature 0):
`{"requested_date", "requested_time", "time_of_day"}`. Hasil divalidasi; jika tidak valid, hasil rule-based dipakai.

Contoh: "minta tolong jadwal coaching saya dimundurin seminggu ya" (dikirim Jumat 9 Okt 2026) → parser kosong →
LLM → `requested_date: 2026-10-16`, `source: "LLM"`.

## Riwayat versi

| Versi | Perubahan | Alasan |
|---|---|---|
| `draft-v1` | Versi awal | — |
| `draft-v2` | PENDING + ada slot → wajib menawarkan slot; jadwal disetujui wajib ditulis lengkap tanggal + jam; larang salam berbasis waktu ("selamat siang") | Uji awal: draft PENDING tidak menawarkan slot, draft APPROVED gagal guardrail, salam waktu bisa salah |
