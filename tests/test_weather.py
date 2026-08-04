"""
Basic tests for Météo Express Pro core logic (WeatherAI, helpers, etc.).
Run with: pytest tests/ -v
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pytest
from backend.services.ai_engine import WeatherAI
from backend.services.weather_service import get_aqi_details, get_uv_details, build_forecast
from datetime import datetime


@pytest.fixture
def ai():
    return WeatherAI()


def test_clothing_rules_freezing(ai):
    items = ai.get_clothing(-5)
    assert any("Manteau d'hiver" in i["name"] for i in items)
    assert any(i["category"] == "gloves" for i in items)


def test_clothing_rules_hot(ai):
    items = ai.get_clothing(38)
    assert any(i["category"] in ("tank", "shorts") for i in items)


def test_activity_rules(ai):
    clear = ai.get_activities("Clear")
    assert any("Course à pied" in act for act in clear["activities"])
    assert clear["icon"] == "☀️"

    thunder = ai.get_activities("Thunderstorm")
    assert any("Restez chez vous" in act for act in thunder["activities"])
    assert thunder["warning"] is not None


def test_health_alerts(ai):
    alerts = ai.get_health(37, 3, 40)
    assert len(alerts) >= 1
    assert any("chaleur" in (a["advice"] or "").lower() for a in alerts)

    cold_alerts = ai.get_health(-2, 2, 50)
    assert any("Froid" in (a["advice"] or "") for a in cold_alerts)


def test_comfort_index(ai):
    assert ai._calculate_comfort_index(22, 50) == 95
    assert ai._calculate_comfort_index(3, 70) == 30
    assert ai._calculate_comfort_index(25, 80) == 60


def test_travel_advice(ai):
    assert "glissantes" in ai.get_travel("Rain").lower()
    assert "idéales" in ai.get_travel("Clear").lower()


def test_best_day_logic(ai):
    fake_forecast = [
        {"condition": "Clear", "temp_max": 25},
        {"condition": "Rain", "temp_max": 18},
        {"condition": "Clouds", "temp_max": 22},
    ]
    best = ai.get_best_day(fake_forecast, "running")
    assert best is not None
    assert best["condition"] == "Clear"


def test_aqi_details():
    good = get_aqi_details(2)
    assert good["label"] == "Bon"
    assert "💛" in good["icon"]

    bad = get_aqi_details(5)
    assert "Très Mauvais" in bad["label"]


def test_uv_details():
    low = get_uv_details(1)
    assert low["risk"] == "Faible"

    extreme = get_uv_details(12)
    assert extreme["risk"] == "Extrême"


def test_build_forecast_minimal():
    # Simulate a tiny OWM forecast payload
    raw = {
        "list": [
            {"dt": 1700000000, "main": {"temp_max": 19, "temp_min": 12, "humidity": 70}, "weather": [{"main": "Clear", "description": "clear sky"}], "wind": {"speed": 3}},
            {"dt": 1700003600, "main": {"temp_max": 20, "temp_min": 11, "humidity": 65}, "weather": [{"main": "Clear", "description": "clear sky"}], "wind": {"speed": 2.5}},
        ]
    }
    days = build_forecast(raw, "metric")
    assert len(days) >= 1
    assert days[0]["temp_max"] >= days[0]["temp_min"]


if __name__ == "__main__":
    pytest.main([__file__, "-q"])


# ==================== /api/transcribe endpoint tests ====================

class TestTranscribeEndpoint:
    """Tests for the Groq Whisper voice transcription endpoint."""

    def test_transcribe_no_audio(self, client):
        """POST without audio file returns 400."""
        resp = client.post("/api/transcribe", data={"lang": "fr"})
        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data

    def test_transcribe_audio_too_large(self, client):
        """POST with >10 MB audio returns 400."""
        import io
        large = io.BytesIO(b"\x00" * (10 * 1024 * 1024 + 1))
        resp = client.post(
            "/api/transcribe",
            data={"audio": (large, "big.webm"), "lang": "fr"},
            content_type="multipart/form-data",
        )
        assert resp.status_code == 400
        data = resp.get_json()
        assert "volumineux" in data["error"]

    def test_transcribe_groq_unavailable(self, client, monkeypatch):
        """Returns 503 when groq_client is None."""
        import io
        import backend.routes.weather as wmod
        monkeypatch.setattr(wmod, "groq_client", None, raising=False)
        # Also patch the lazy import inside the route
        import backend.services.ai_engine as aimod
        original = aimod.groq_client
        aimod.groq_client = None
        try:
            resp = client.post(
                "/api/transcribe",
                data={"audio": (io.BytesIO(b"\x00\x01"), "test.webm"), "lang": "fr"},
                content_type="multipart/form-data",
            )
            assert resp.status_code == 503
        finally:
            aimod.groq_client = original

    def test_transcribe_success(self, client, monkeypatch):
        """Valid audio returns transcribed text."""
        import io
        import types

        fake_transcription = types.SimpleNamespace(text="Paris")
        fake_client = types.SimpleNamespace(
            audio=types.SimpleNamespace(
                transcriptions=types.SimpleNamespace(
                    create=lambda **kw: fake_transcription
                )
            )
        )

        import backend.services.ai_engine as aimod
        original = aimod.groq_client
        aimod.groq_client = fake_client
        try:
            resp = client.post(
                "/api/transcribe",
                data={
                    "audio": (io.BytesIO(b"\x00\x01\x02"), "recording.webm"),
                    "lang": "fr",
                },
                content_type="multipart/form-data",
            )
            assert resp.status_code == 200
            data = resp.get_json()
            assert data["text"] == "Paris"
        finally:
            aimod.groq_client = original

    def test_transcribe_invalid_lang_defaults_to_fr(self, client, monkeypatch):
        """Invalid language code defaults to 'fr'."""
        import io
        import types

        captured = {}
        fake_transcription = types.SimpleNamespace(text="test")

        def fake_create(**kw):
            captured.update(kw)
            return fake_transcription

        fake_client = types.SimpleNamespace(
            audio=types.SimpleNamespace(
                transcriptions=types.SimpleNamespace(create=fake_create)
            )
        )

        import backend.services.ai_engine as aimod
        original = aimod.groq_client
        aimod.groq_client = fake_client
        try:
            resp = client.post(
                "/api/transcribe",
                data={
                    "audio": (io.BytesIO(b"\x00"), "rec.webm"),
                    "lang": "de",
                },
                content_type="multipart/form-data",
            )
            assert resp.status_code == 200
            assert captured["language"] == "fr"
        finally:
            aimod.groq_client = original


class TestCompareAnalysis:
    """Tests for the /api/compare-analysis endpoint."""

    def test_compare_analysis_missing_data(self, client):
        """Missing data1/data2 returns 400."""
        resp = client.post(
            "/api/compare-analysis",
            json={"lang": "fr"},
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_compare_analysis_rule_based_fallback(self, client, monkeypatch):
        """When Groq is unavailable, returns rule-based analysis."""
        import backend.services.ai_engine as aimod
        original = aimod.groq_client
        aimod.groq_client = None
        try:
            data1 = {
                "meteo": {"ville": "Paris", "temperature": 22, "temperature_reelle": 20,
                          "description": "Clear sky", "humidite": 55, "vent": 3.5,
                          "condition": "Clear"},
                "comfort_index": 75,
                "qualite_air": {"aqi": 2, "label": "Bon"},
                "uv": {"index": 5, "risk": "Modere"},
                "hourly": [{"heure": "14:00", "temp": 22}],
            }
            data2 = {
                "meteo": {"ville": "Tokyo", "temperature": 28, "temperature_reelle": 30,
                          "description": "Humid", "humidite": 80, "vent": 1.2,
                          "condition": "Clouds"},
                "comfort_index": 60,
                "qualite_air": {"aqi": 3, "label": "Moderate"},
                "uv": {"index": 7, "risk": "Eleve"},
                "hourly": [{"heure": "14:00", "temp": 28}],
            }
            resp = client.post(
                "/api/compare-analysis",
                json={"data1": data1, "data2": data2, "lang": "fr"},
                content_type="application/json",
            )
            assert resp.status_code == 200
            result = resp.get_json()
            assert "summary" in result
            assert "winner_overall" in result
            assert "winner_comfort" in result
            assert "winner_outdoor" in result
            assert "winner_travel" in result
            assert "differences" in result
            assert "warnings" in result
            assert isinstance(result["winner_overall"], dict)
            assert "city" in result["winner_overall"]
        finally:
            aimod.groq_client = original

    def test_compare_analysis_english(self, client, monkeypatch):
        """English language parameter is accepted."""
        import backend.services.ai_engine as aimod
        original = aimod.groq_client
        aimod.groq_client = None
        try:
            data1 = {
                "meteo": {"ville": "Paris", "temperature": 22, "temperature_reelle": 20,
                          "description": "Clear", "humidite": 55, "vent": 3.5,
                          "condition": "Clear"},
                "comfort_index": 75,
                "hourly": [],
            }
            data2 = {
                "meteo": {"ville": "London", "temperature": 18, "temperature_reelle": 16,
                          "description": "Rainy", "humidite": 90, "vent": 5.0,
                          "condition": "Rain"},
                "comfort_index": 45,
                "hourly": [],
            }
            resp = client.post(
                "/api/compare-analysis",
                json={"data1": data1, "data2": data2, "lang": "en"},
                content_type="application/json",
            )
            assert resp.status_code == 200
            result = resp.get_json()
            assert "summary" in result
            assert len(result["summary"]) > 10
        finally:
            aimod.groq_client = original
