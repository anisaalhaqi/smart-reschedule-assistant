from datetime import datetime

from app.config import WIB
from app.extraction import extract_preference, format_date_id

FRIDAY_EVENING = datetime(2026, 10, 9, 19, 0, tzinfo=WIB)


def test_example_from_project_plan():
    p = extract_preference("Besok sore nggak bisa, pindah Sabtu pagi dong", FRIDAY_EVENING)
    assert p.requested_date == "2026-10-10"
    assert p.day_name == "Sabtu"
    assert p.time_of_day == "pagi"
    assert (p.start_time, p.end_time) == ("06:00", "11:00")
    assert p.source == "RULE"


def test_explicit_hour_with_part_of_day():
    p = extract_preference("bsk gbs kak, mingdep senin jam 4 sore bisa?", FRIDAY_EVENING)
    assert p.requested_date == "2026-10-12"
    assert p.requested_time == "16:00"


def test_from_to_pattern_and_time_range():
    p = extract_preference("dari kamis ke sabtu jam 7-9 ya min", FRIDAY_EVENING)
    assert p.requested_date == "2026-10-10"
    assert (p.start_time, p.end_time) == ("07:00", "09:00")


def test_explicit_date_with_month():
    p = extract_preference("tgl 20 okt jam 10.30 bisa?", FRIDAY_EVENING)
    assert (p.requested_date, p.requested_time) == ("2026-10-20", "10:30")


def test_minggu_as_week_vs_sunday():
    week = extract_preference("minggu depan aja kak", FRIDAY_EVENING)
    assert week.requested_date is None
    assert (week.date_from, week.date_to) == ("2026-10-12", "2026-10-18")
    sunday = extract_preference("hari minggu siang ada?", FRIDAY_EVENING)
    assert sunday.requested_date == "2026-10-11"


def test_same_weekday_is_flagged_ambiguous():
    p = extract_preference("Kamis ga bisa kak. Bisanya jumat malam", FRIDAY_EVENING)
    assert p.requested_date == "2026-10-16"
    assert p.is_ambiguous


def test_cancellation_has_no_preference():
    p = extract_preference("Kak, sesi Kamis saya batalkan dulu ya, lagi kurang sehat", FRIDAY_EVENING)
    assert p.is_empty and p.source == "NONE"


def test_bare_hour_assumed_afternoon():
    assert extract_preference("jam 4 aja ya", FRIDAY_EVENING).requested_time == "16:00"


def test_format_date_id():
    assert format_date_id("2026-10-17") == "Sabtu, 17 Oktober 2026"
