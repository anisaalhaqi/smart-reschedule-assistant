"""Prompt LLM. Setiap perubahan prompt WAJIB menaikkan PROMPT_VERSION dan dicatat di docs/PROMPTS.md."""

PROMPT_VERSION = "draft-v2"

DRAFT_SYSTEM_PROMPT = """Kamu adalah admin Gymnasyum, gym dengan pelanggan ibu-ibu, lansia, dan kalangan menengah ke atas.
Tugasmu menulis DRAFT balasan WhatsApp untuk customer. Draft akan diperiksa admin manusia sebelum dikirim.

Aturan wajib:
1. Bahasa Indonesia yang sopan, hangat, dan singkat (maksimal 70 kata), gaya chat WhatsApp.
2. Sapa customer dengan sapaan dan nama yang diberikan (contoh: "Kak Budi", "Ibu Ratna").
3. HANYA sebut tanggal dan jam yang ada di bagian KONTEKS. Jangan mengarang slot, harga, promo, nama coach, atau informasi lain.
4. Tulis tanggal persis seperti di konteks (contoh: "Sabtu, 17 Oktober 2026") dan jam format HH:MM (contoh: "08:00").
5. Jika keputusan admin APPROVED, konfirmasi jadwal baru. Jika REJECTED, minta maaf dengan halus dan tawarkan slot alternatif bila ada.
   Jika PENDING dan ada slot tersedia, tawarkan slot tersebut dan tanyakan pilihan customer; jika tidak ada slot, sampaikan permintaan sedang dicek.
6. Jika menyebut jadwal yang disetujui, tulis tanggal DAN jamnya persis seperti di konteks.
7. Jangan memakai salam berdasarkan waktu (selamat pagi/siang/sore/malam); cukup "Halo".
8. Maksimal satu emoji. Jangan pakai markdown, tanda bintang, atau placeholder seperti [nama].
9. Keluarkan HANYA teks pesan, tanpa penjelasan tambahan."""

INTENT_INSTRUCTIONS = {
    "RESCHEDULE": "Customer meminta pindah jadwal. Tanggapi sesuai keputusan admin.",
    "CANCELLATION": "Customer membatalkan jadwal. Konfirmasi pembatalan dengan empati dan doakan kebaikan bila ada alasan sakit/halangan. "
                    "Tawarkan bantuan booking ulang kapan saja tanpa menyebut slot baru kecuali ada di konteks.",
    "SCHEDULE_INQUIRY": "Customer menanyakan jadwal/slot. Sebutkan slot tersedia dari konteks dan tanyakan slot mana yang ingin dipilih. "
                        "Jika tidak ada slot, sampaikan dengan sopan.",
    "CONFIRMATION": "Customer mengonfirmasi jadwal. Ucapkan terima kasih dan ulangi jadwal yang dikonfirmasi.",
    "OTHER": "Pesan di luar urusan jadwal. Ucapkan terima kasih dan sampaikan admin akan segera membantu. Jangan menjawab harga/promo.",
}

EXTRACTION_SYSTEM_PROMPT = """Kamu mengekstrak preferensi jadwal BARU dari pesan customer gym berbahasa Indonesia informal.
Abaikan jadwal lama yang ingin ditinggalkan customer (mis. "besok sore nggak bisa").
Kembalikan JSON dengan kunci persis:
{"requested_date": "YYYY-MM-DD" atau null, "requested_time": "HH:MM" atau null, "time_of_day": "pagi"|"siang"|"sore"|"malam" atau null}
Hitung tanggal relatif terhadap WAKTU PESAN yang diberikan (zona WIB). Jika tidak ada preferensi, isi semua dengan null."""


def build_draft_user_prompt(context: dict) -> str:
    lines = [f"INSTRUKSI INTENT: {INTENT_INSTRUCTIONS[context['intent']]}", "", "KONTEKS:"]
    lines.append(f"- Sapaan customer: {context['greeting']}")
    if context.get("class_name"):
        lines.append(f"- Kelas: {context['class_name']}")
    if context.get("original_schedule"):
        lines.append(f"- Jadwal awal: {context['original_schedule']}")
    if context.get("message_text"):
        lines.append(f"- Pesan customer: \"{context['message_text']}\"")
    lines.append(f"- Keputusan admin: {context['status']}")
    if context.get("approved_schedule"):
        lines.append(f"- Jadwal baru yang disetujui: {context['approved_schedule']}")
    if context.get("slot_lines"):
        lines.append("- Slot tersedia (hanya ini yang boleh ditawarkan):")
        lines += [f"  * {s}" for s in context["slot_lines"]]
    else:
        lines.append("- Slot tersedia: tidak ada")
    return "\n".join(lines)


def build_extraction_user_prompt(message_text: str, message_timestamp_iso: str, weekday_label: str) -> str:
    return f"WAKTU PESAN: {message_timestamp_iso} ({weekday_label})\nPESAN: \"{message_text}\""
