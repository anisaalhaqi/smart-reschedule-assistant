from app import drafting

SCHEDULE = {"id": 101, "customer_name": "Budi Santoso", "class_name": "Personal Training", "date": "2026-10-15",
            "time": "09:00", "status": "scheduled"}
SLOTS = [
    {"slot_id": 701, "date": "2026-10-17", "start_time": "08:00", "end_time": "09:00", "available": True},
    {"slot_id": 702, "date": "2026-10-17", "start_time": "10:00", "end_time": "11:00", "available": True},
    {"slot_id": 703, "date": "2026-10-17", "start_time": "07:00", "end_time": "08:00", "available": False},
]


def test_health(client):
    body = client.get("/health").json()
    assert body["data"]["status"] == "ok"
    assert body["data"]["model_name"] == "tfidf-logreg"


def test_analyze_example(client):
    res = client.post("/api/v1/analyze", json={
        "message_text": "Besok sore nggak bisa, pindah Sabtu pagi dong",
        "message_timestamp": "2026-10-09T19:00:00+07:00",
    })
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["intent"] == "RESCHEDULE"
    assert data["preference"]["requested_date"] == "2026-10-10"
    assert data["preference"]["time_of_day"] == "pagi"


def test_analyze_naive_timestamp_is_wib(client):
    data = client.post("/api/v1/analyze", json={"message_text": "besok pagi ya",
                                                "message_timestamp": "2026-10-09T19:00:00"}).json()["data"]
    assert data["message_timestamp"].endswith("+07:00")


def test_classify_scores_sum_to_one(client):
    data = client.post("/api/v1/classify", json={"message_text": "Kak, paket private coaching berapa ya?"}).json()["data"]
    assert data["intent"] == "OTHER"
    assert abs(sum(data["scores"].values()) - 1) < 1e-3


def test_validation_error_format(client):
    res = client.post("/api/v1/analyze", json={"message_text": "   "})
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "VALIDATION_ERROR"
    res = client.post("/api/v1/analyze", json={})
    assert res.status_code == 400 and "message_text" in res.json()["error"]["message"]


def test_not_found_format(client):
    res = client.get("/api/v1/nope")
    assert res.status_code == 404 and res.json()["error"]["code"] == "NOT_FOUND"


def test_draft_template_approved(client):
    res = client.post("/api/v1/draft-response", json={
        "intent": "RESCHEDULE", "schedule": SCHEDULE, "available_slots": SLOTS,
        "status": "APPROVED", "approved_date": "2026-10-17", "approved_time": "08:00",
    })
    data = res.json()["data"]
    assert data["source"] == "TEMPLATE"
    assert "Kak Budi" in data["draft_text"] and "Sabtu, 17 Oktober 2026 pukul 08:00" in data["draft_text"]
    assert data["mentioned_slots"] == [{"slot_id": 701, "date": "2026-10-17", "start_time": "08:00"}]


def test_draft_template_lists_only_available_slots(client):
    data = client.post("/api/v1/draft-response", json={
        "intent": "SCHEDULE_INQUIRY", "customer_name": "Ibu Ratna Dewi", "salutation": "Ibu", "available_slots": SLOTS,
    }).json()["data"]
    assert "Ibu Ratna" in data["draft_text"]
    assert "07:00" not in data["draft_text"]
    assert [s["slot_id"] for s in data["mentioned_slots"]] == [701, 702]


def test_draft_approved_requires_slot(client):
    res = client.post("/api/v1/draft-response", json={"intent": "RESCHEDULE", "status": "APPROVED"})
    assert res.status_code == 400


def test_llm_draft_passes_guardrail(client, monkeypatch):
    monkeypatch.setattr(drafting.llm, "generate", lambda *a, **k: (
        "Halo Kak Budi, jadwal Personal Training Kakak sudah kami pindahkan ke Sabtu, 17 Oktober 2026 pukul 08:00 ya 🙏"))
    data = client.post("/api/v1/draft-response", json={
        "intent": "RESCHEDULE", "schedule": SCHEDULE, "available_slots": SLOTS,
        "status": "APPROVED", "approved_date": "2026-10-17", "approved_time": "08:00",
    }).json()["data"]
    assert data["source"] == "LLM"


def test_llm_hallucinated_slot_falls_back_to_template(client, monkeypatch):
    monkeypatch.setattr(drafting.llm, "generate", lambda *a, **k: (
        "Halo Kak Budi, slot tersedia Minggu, 18 Oktober 2026 pukul 14:00 ya"))
    data = client.post("/api/v1/draft-response", json={
        "intent": "SCHEDULE_INQUIRY", "schedule": SCHEDULE, "available_slots": SLOTS,
    }).json()["data"]
    assert data["source"] == "TEMPLATE"
    assert data["fallback_reason"].startswith("GUARDRAIL:")


def test_api_key_enforced(client, monkeypatch):
    from dataclasses import replace

    from app import main
    monkeypatch.setattr(main, "settings", replace(main.settings, api_key="secret"))
    assert client.post("/api/v1/classify", json={"message_text": "halo"}).status_code == 401
    assert client.post("/api/v1/classify", json={"message_text": "halo"},
                       headers={"X-API-Key": "secret"}).status_code == 200
