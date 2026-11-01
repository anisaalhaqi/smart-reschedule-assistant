import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def offline_llm(monkeypatch):
    """Test tidak memanggil Gemini sungguhan; test tertentu menimpa ini dengan output palsu."""
    from app import llm
    monkeypatch.setattr(llm, "generate", lambda *a, **k: None)
