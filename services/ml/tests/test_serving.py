from __future__ import annotations

from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from vendorshield_ml.serving import app as app_module
from vendorshield_ml.serving.inference import Predictor


def _client(trained_settings) -> TestClient:
    app_module._state["predictor"] = Predictor(trained_settings)
    return TestClient(app_module.app)


def test_health(trained_settings):
    client = _client(trained_settings)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["model_loaded"] is True


def test_predict_returns_scored_supplier(trained_settings):
    client = _client(trained_settings)
    base = datetime(2024, 1, 1)
    deliveries = [
        {
            "supplier_id": "sup-A",
            "planned_date": (base + timedelta(days=30 * i)).isoformat(),
            "actual_date": (base + timedelta(days=30 * i + (5 if i % 2 else 0))).isoformat(),
            "ppm": 4000 + i * 100,
            "quantity": 500,
        }
        for i in range(12)
    ]
    res = client.post("/predict", json={"deliveries": deliveries})
    assert res.status_code == 200, res.text
    body = res.json()
    assert len(body["predictions"]) == 1
    p = body["predictions"][0]
    assert 0 <= p["delay_probability"] <= 100
    assert p["risk_level"] in {"low", "medium", "high", "critical"}
    assert p["data_points"] == 12
