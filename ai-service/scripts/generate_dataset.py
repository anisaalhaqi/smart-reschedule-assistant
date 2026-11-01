"""Generate dataset synthetic pesan customer Gymnasyum (5 intent) + split stratified.

Seed pesan ditulis manual sebagai template, lalu diperbanyak dengan slot filling
(hari, jam, kelas, alasan, nama fiktif) dan augmentasi (singkatan, typo, huruf
berulang, emoji, gaya formal/santai). Semua nama bersifat fiktif.

Output:
    data/synthetic_messages.csv           seluruh data synthetic (id, message_text, intent, source, style)
    data/processed/{train,val,test}.csv   split stratified 70/15/15

Pemakaian:
    python scripts/generate_dataset.py --per-intent 300 --seed 42
"""
import argparse
import random
import re
import sys
from pathlib import Path

import pandas as pd
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.preprocessing import preprocess  # noqa: E402

INTENTS = ["RESCHEDULE", "CANCELLATION", "SCHEDULE_INQUIRY", "CONFIRMATION", "OTHER"]

GREET = ["kak", "min", "halo kak", "pagi kak", "permisi kak", "selamat siang admin", "kakak", "mbak", "mas",
         "halo admin", "kak admin", "selamat pagi kak", "sore kak", "assalamualaikum kak", "hai kak", "", "", ""]
DAYS = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu", "hari sabtu", "hari minggu", "hari kamis"]
REL = ["besok", "lusa", "hari ini", "nanti"]
TOD = ["pagi", "siang", "sore", "malam"]
HOURS = ["jam 7", "jam 8", "jam 9", "jam 10", "jam 08.00", "jam 16.00", "pukul 7", "pukul 09.30", "jam 4 sore",
         "jam 5 sore", "jam 7 malam", "jam 6 pagi", "jam 10an", "jam 3 sore", "jam 19.00", "setengah 8"]
CLASSES = ["sesi PT", "personal training", "kelas yoga", "kelas pilates", "kelas zumba", "senam lansia",
           "kelas aerobik", "body combat", "sesi gym", "latihan", "kelas", "sesi", "jadwal", "sesi private",
           "kelas senam", "sesi coaching"]
COACHES = ["Andi", "Rina", "Dimas", "Sari", "Bayu", "Lia", "Yoga", "Tika", "Fajar", "Dewi"]
NAMES = ["Bu Ratna", "Pak Hendra", "Bu Wati", "Bu Siska", "Pak Joko", "Bu Lestari", "Rara", "Bu Mira",
         "Pak Gunawan", "Bu Yanti", "Nadia", "Bu Endang"]
REASONS = ["ada acara keluarga", "lagi kurang enak badan", "anak saya sakit", "ada meeting mendadak",
           "mau ke dokter", "cucu saya datang", "ada arisan", "kejebak macet", "suami minta diantar",
           "lagi di luar kota", "ada kondangan", "badan lagi pegal semua", "ada urusan kantor",
           "lagi flu", "ada pengajian", "mobil lagi di bengkel", "ART saya pulang kampung", "hujan deras"]
NEG = ["nggak bisa", "ga bisa", "berhalangan", "tidak bisa hadir", "ga bisa dateng", "ada halangan",
       "bentrok", "gak sempet", "tidak bisa", "gabisa"]
CLOSE = ["ya", "dong", "ya kak", "makasih", "terima kasih", "🙏", "mohon maaf ya", "ya min", "kak", "",
         "makasih kak", "trims", "thx", "😊", "ya, maaf merepotkan", ""]
PRICES = ["paket private coaching", "membership bulanan", "member tahunan", "kelas yoga", "paket 10 sesi PT",
          "personal trainer", "kelas pilates", "day pass"]


def when(rng: random.Random) -> str:
    """Satu ekspresi waktu: 'sabtu pagi', 'besok jam 8', 'tanggal 17 jam 10', ..."""
    kind = rng.random()
    if kind < 0.35:
        return f"{rng.choice(DAYS)} {rng.choice(TOD)}"
    if kind < 0.6:
        return f"{rng.choice(DAYS)} {rng.choice(HOURS)}"
    if kind < 0.8:
        return f"{rng.choice(REL)} {rng.choice(TOD + HOURS)}"
    if kind < 0.9:
        return f"tanggal {rng.randint(1, 28)} {rng.choice(HOURS)}"
    return rng.choice(["minggu depan", f"{rng.choice(DAYS)} minggu depan", f"{rng.choice(DAYS)} depan",
                       rng.choice(DAYS)])


TEMPLATES: dict[str, list[str]] = {
    "RESCHEDULE": [
        "{greet} {orig} {neg}, pindah {target} {close}",
        "{greet} saya mau reschedule {cls} {orig} ke {target} bisa?",
        "{greet} boleh minta ganti jadwal {cls} saya jadi {target}?",
        "{orig} saya {neg} karena {reason}, bisa diganti {target}?",
        "{greet} mohon izin, {cls} {orig} bisa dimundurkan ke {target}?",
        "geser ke {target} bisa ga {greet}",
        "{greet} {cls} saya yang {orig} dipindah ke {target} ya, {reason}",
        "maaf {greet}, {reason}. jadwalnya bisa diganti {target}?",
        "{greet} mau ubah jadwal dong, dari {orig} jadi {target}",
        "Selamat pagi, saya ingin mengajukan perubahan jadwal {cls} dari {orig} ke {target}. Terima kasih.",
        "{greet} kalau {cls} saya dipindah ke {target} bisa nggak? {orig} {neg}",
        "tolong pindahin jadwal saya ke {target} {greet}",
        "bisa reschedule ke {target} ga {greet}? {reason}",
        "{orig} diganti {target} bisa {greet}?",
        "{greet} saya {name}, sesi {orig} mau saya majukan ke {target}",
        "{greet} jadwal ku tuker ke {target} ya",
        "{greet} {reason}, jadi {orig} skip dulu, gantinya {target} bisa?",
        "{greet} resched dong ke {target}, {orig} {neg}",
        "Mohon maaf {greet}, untuk {cls} {orig} apakah bisa dipindahkan ke {target}? Saya {reason}.",
        "{greet} bisanya {target} aja, {orig} {neg} {close}",
        "{greet} jadwal {orig} minta digeser ke {target} ya",
        "{greet} {cls} {orig} saya undur ke {target} bisa kah?",
        "{greet} ganti hari bisa? {target} aja",
        "{greet} {orig} mendadak {neg} nih, pindah ke {target} masih bisa ga",
        "{greet} saya {name}, mau reschedule {cls}. {orig} {neg}, kalau {target} kosong saya ambil",
        "{greet} sesi saya pindahin {target} ya {close}",
        "{greet} {orig} {neg}, ganti ke {target} aja bisa?",
        "Selamat siang {greet}, saya mohon jadwal {cls} saya diubah menjadi {target} karena {reason}.",
        "maaf {greet} {reason}, minta tolong dipindah jadwalnya ke {target}",
        "{greet} {orig} kan jadwal saya, bisa dimajuin ke {target}?",
    ],
    "CANCELLATION": [
        "{greet} sesi {orig} saya batalkan dulu ya, {reason}",
        "{greet} mau cancel {cls} {orig} {close}",
        "maaf {greet}, saya tidak bisa hadir {orig}, dibatalkan saja ya",
        "{greet} batalin jadwal saya {orig} ya, nanti saya kabari lagi kalau mau booking",
        "{greet} saya izin tidak ikut {cls} {orig}, {reason}",
        "tolong cancel booking {cls} saya {close}",
        "{greet} {orig} saya off dulu ya, {reason}, ga usah diganti",
        "Selamat siang, dengan ini saya membatalkan jadwal {cls} pada {orig}. Mohon maaf.",
        "{greet} kayaknya saya stop dulu {cls} {orig}, {reason}",
        "{greet} untuk {orig} di-cancel aja ya, belum tau kapan bisa lagi",
        "{greet} {cls} saya {orig} hapus aja ya",
        "{greet} tidak jadi datang {orig}, mohon dibatalkan",
        "{greet} {reason}, jadi {cls} {orig} batal ya {close}",
        "{greet} saya {name}, mau batalin sesi {orig}. ga perlu dijadwalin ulang",
        "{greet} {cls} {orig} cancel ya, {reason}",
        "maaf {greet} mendadak {reason}, sesi {orig} saya batalkan",
        "{greet} booking saya yang {orig} tolong dibatalkan, terima kasih",
        "{greet} {orig} absen dulu ya, {reason}. nanti kalau sudah sehat saya booking lagi",
        "{greet} ga jadi ikut {cls} {orig} ya, maaf banget",
        "Mohon maaf {greet}, saya batalkan {cls} {orig} karena {reason}.",
        "{greet} sesi PT saya bulan ini dibatalkan semua dulu ya, {reason}",
        "{greet} cancel aja {orig}, saya nggak bisa reschedule juga",
        "{greet} saya mundur dari {cls} {orig} ya {close}",
        "{greet} {orig} skip dulu ya kak, gausah dicariin ganti",
        "{greet} batal ya {orig}, {reason}",
    ],
    "SCHEDULE_INQUIRY": [
        "{greet} {target} ada slot kosong ga?",
        "{greet} jadwal {cls} {day} jam berapa aja ya?",
        "{greet} coach {coach} ada slot {day} {tod}?",
        "{greet} kalau {target} masih bisa booking?",
        "jadwal saya {rel} jam berapa ya {greet}?",
        "{greet} mau tanya, {cls} minggu depan ada di hari apa saja?",
        "{greet} slot {day} {tod} masih ada yang kosong?",
        "{greet} saya lupa jadwal {cls} saya, kapan ya?",
        "{greet} {rel} {tod} penuh ga?",
        "Permisi, untuk {cls} di hari {day} apakah masih tersedia slot?",
        "{greet} jadwal coach {coach} minggu ini gimana?",
        "{greet} {cls} {day} mulai jam berapa?",
        "{greet} yang available {day} jam berapa aja?",
        "{greet} sesi saya berikutnya kapan ya?",
        "{greet} {target} masih ada tempat ga buat {cls}?",
        "{greet} coach {coach} kosongnya hari apa aja ya?",
        "Selamat pagi {greet}, boleh info jadwal {cls} minggu ini?",
        "{greet} saya {name}, jadwal latihan saya minggu ini apa saja ya?",
        "{greet} kalau {tod} biasanya ada kelas apa aja?",
        "{greet} {day} ini {cls} jadi ada kan?",
        "{greet} cek slot {target} dong",
        "{greet} kira-kira {target} rame ga? masih bisa daftar?",
        "{greet} tolong kirim jadwal {cls} bulan ini",
        "{greet} ada slot {tod} ga di minggu depan?",
        "{greet} jam berapa aja yang kosong {rel}?",
    ],
    "CONFIRMATION": [
        "oke {greet}, {target} aja ya, {close}",
        "{greet} siap, saya hadir {orig}",
        "baik {greet}, saya ambil slot {target}",
        "{greet} oke deal {target}",
        "sip {greet}, sampai ketemu {target}",
        "{greet} iya jadwal {target} sudah pas, terima kasih",
        "{greet} saya konfirmasi datang {cls} {orig} ya",
        "baik, saya setuju dipindah ke {target}. Terima kasih {greet}",
        "{greet} on the way ya, {cls} {rel} tetap jadi kok",
        "oke {greet} noted, {target} saya datang",
        "iya {greet} bisa, {target} cocok",
        "{greet} yang {target} saya ambil ya",
        "siap {greet}, {rel} saya datang tepat waktu",
        "ok",
        "oke siap",
        "{greet} sudah saya terima jadwal barunya, makasih",
        "iya {greet}, jadi {orig} ya. saya pasti datang",
        "Baik {greet}, saya konfirmasi kehadiran untuk {cls} {orig}. Terima kasih.",
        "{greet} slot yang ditawarkan {target} saya setuju",
        "mantap {greet}, {target} fix ya",
        "{greet} iya betul, {orig} saya tetap ikut",
        "oke makasih {greet}, berarti {target} ya",
        "{greet} siap laksanakan, {orig} saya hadir",
        "{greet} jadi ya {target}, saya sudah catat",
        "sip {close}",
    ],
    "OTHER": [
        "{greet} {price} berapa ya?",
        "{greet} harga {price} sekarang berapa?",
        "{greet} ada promo bulan ini?",
        "{greet} AC di ruang yoga panas banget",
        "{greet} saya mau bayar via transfer ke rekening mana?",
        "{greet} parkir mobil ada?",
        "{greet} handuk saya ketinggalan di loker",
        "halo {greet}",
        "selamat pagi {greet}",
        "{greet} bisa daftar member baru di mana?",
        "{greet} kalau mau perpanjang member gimana caranya?",
        "{greet} coach {coach} bisa bantu program diet?",
        "{greet} saya mau komplain, alatnya banyak yang rusak",
        "terima kasih {greet} atas pelayanannya",
        "{greet} wifi passwordnya apa?",
        "{greet} boleh bawa teman untuk trial?",
        "{greet} invoice bulan lalu tolong dikirim ulang",
        "{greet} lokasi gymnya di mana ya?",
        "{greet} bisa bayar pakai QRIS?",
        "{greet} kamar mandinya kotor, tolong dibersihkan",
        "{greet} saya mau tanya soal {price}, apa saja benefitnya?",
        "{greet} cocok ga ya buat lansia yang lututnya sakit?",
        "{greet} saya mau ganti nomor HP yang terdaftar",
        "{greet} loker bisa disewa bulanan?",
        "{greet} kenapa tagihan saya dobel ya?",
        "{greet} anak umur 15 boleh ikut gym?",
        "makasih banyak {greet} 🙏",
        "{greet} sudah transfer ya untuk {price}",
        "{greet} ada diskon untuk lansia?",
        "{greet} coach {coach} masih kerja di sini?",
    ],
}

# Augmentasi gaya: formal -> varian santai/singkatan
SLANG_VARIANTS = {
    "tidak": ["gak", "ga", "nggak", "gk", "tdk", "engga"], "bisa": ["bs", "bsa", "bisa"],
    "besok": ["bsk", "besok", "besuk"], "saya": ["sy", "aku", "saya", "aq"], "jadwal": ["jdwl", "jadwal"],
    "terima kasih": ["makasih", "mksh", "thx", "trims"], "sudah": ["udah", "udh", "sdh"],
    "kalau": ["kalo", "klo"], "yang": ["yg"], "untuk": ["utk"], "tolong": ["tlg"], "dulu": ["dl", "dlu"],
    "malam": ["mlm"], "minggu depan": ["mingdep", "minggu dpn"], "tanggal": ["tgl"], "sabtu": ["sbtu", "sabtu"],
    "berapa": ["brp"], "jadi": ["jd"], "saja": ["aja", "aj"], "kak": ["ka", "kk", "kak"], "dong": ["dong", "donk"],
    "reschedule": ["resched", "reskedul", "reschedule"], "batal": ["cancel", "batal"],
}
EMOJI = ["🙏", "😊", "🙂", "😁", "🥲", "👍", "🙏🏻", "😅"]


def augment(text: str, rng: random.Random) -> tuple[str, str]:
    style = "formal" if text[:1].isupper() and rng.random() < 0.5 else "santai"
    if style == "santai":
        for formal, variants in SLANG_VARIANTS.items():
            if formal in text.lower() and rng.random() < 0.5:
                text = re.sub(rf"\b{re.escape(formal)}\b", rng.choice(variants), text, count=1, flags=re.I)
        if rng.random() < 0.25:  # huruf berulang
            words = text.split()
            i = rng.randrange(len(words))
            if words[i].isalpha():
                words[i] = words[i] + words[i][-1] * rng.randint(1, 3)
            text = " ".join(words)
        if rng.random() < 0.15:  # typo: tukar 2 huruf berdekatan
            words = text.split()
            i = rng.randrange(len(words))
            w = words[i]
            if len(w) > 4 and w.isalpha():
                j = rng.randrange(1, len(w) - 2)
                words[i] = w[:j] + w[j + 1] + w[j] + w[j + 2:]
            text = " ".join(words)
        if rng.random() < 0.3:
            text = text.lower()
    if rng.random() < 0.2:
        text = f"{text} {rng.choice(EMOJI)}"
    if rng.random() < 0.1:
        text = text.rstrip("?.!")
    return text, style


def fill(template: str, rng: random.Random) -> str:
    out = template.format(
        greet=rng.choice(GREET), orig=when(rng), target=when(rng), neg=rng.choice(NEG), close=rng.choice(CLOSE),
        reason=rng.choice(REASONS), cls=rng.choice(CLASSES), name=rng.choice(NAMES), coach=rng.choice(COACHES),
        day=rng.choice(DAYS), tod=rng.choice(TOD), rel=rng.choice(REL), price=rng.choice(PRICES),
    )
    out = re.sub(r"\s+", " ", out).strip(" ,")
    out = re.sub(r"\s+([,.?!])", r"\1", out)
    return out[:1].upper() + out[1:] if rng.random() < 0.6 else out


def generate(per_intent: int, seed: int) -> pd.DataFrame:
    rng = random.Random(seed)
    rows = []
    for intent in INTENTS:
        seen: set[str] = set()
        templates = TEMPLATES[intent]
        attempts = 0
        while len(seen) < per_intent and attempts < per_intent * 50:
            attempts += 1
            template = templates[attempts % len(templates)]  # rotasi supaya semua template terwakili
            text = fill(template, rng)
            source = "TEMPLATE"
            style = "formal" if text[:1].isupper() else "santai"
            if rng.random() < 0.7:
                text, style = augment(text, rng)
                source = "AUGMENTED"
            key = preprocess(text)
            if not key or key in seen:
                continue
            seen.add(key)
            rows.append({"message_text": text, "intent": intent, "source": source, "style": style})
    df = pd.DataFrame(rows).sample(frac=1, random_state=seed).reset_index(drop=True)
    df.insert(0, "id", [f"syn-{i:05d}" for i in range(len(df))])
    return df


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--per-intent", type=int, default=300)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    df = generate(args.per_intent, args.seed)
    out_dir = ROOT / "data"
    df.to_csv(out_dir / "synthetic_messages.csv", index=False)

    train, rest = train_test_split(df, test_size=0.30, stratify=df["intent"], random_state=args.seed)
    val, test = train_test_split(rest, test_size=0.50, stratify=rest["intent"], random_state=args.seed)
    for name, part in (("train", train), ("val", val), ("test", test)):
        part.to_csv(out_dir / "processed" / f"{name}.csv", index=False)

    print(f"Total {len(df)} pesan")
    print(df["intent"].value_counts().to_string())
    print(f"train={len(train)} val={len(val)} test={len(test)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
