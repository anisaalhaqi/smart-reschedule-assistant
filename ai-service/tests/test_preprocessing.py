from app.preprocessing import preprocess


def test_slang_negation_and_repeated_letters():
    assert preprocess("Besok soreee gk bisaaa, pindah Sabtu dong kak 🙏") == "besok sore tidak bisa pindah sabtu dong kak"


def test_time_is_standardized():
    assert "08:00" in preprocess("jam 8.00 ya")
    assert "jam 8" in preprocess("jam8 aja")


def test_url_phone_and_hyphen():
    out = preprocess("cek https://gymnasyum.id ya, wa 081234567890. di-cancel aja")
    assert "http" not in out and "0812" not in out
    assert "di batal" in out


def test_question_mark_kept_as_token():
    assert preprocess("ada slot kosong?").endswith("?")
