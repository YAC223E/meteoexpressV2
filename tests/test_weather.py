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
    assert any("Manteau d'hiver" in i for i in items)
    assert any("Gants" in i for i in items)


def test_clothing_rules_hot(ai):
    items = ai.get_clothing(38)
    assert any("Débardeur" in i or "Short" in i for i in items)


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
