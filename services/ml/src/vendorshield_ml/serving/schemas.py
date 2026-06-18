"""Request/response contracts for the prediction API."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DeliveryIn(BaseModel):
    supplier_id: str
    planned_date: datetime
    actual_date: datetime | None = None
    ppm: float | None = None
    quantity: float | None = None


class PredictRequest(BaseModel):
    deliveries: list[DeliveryIn] = Field(..., min_length=1)


class Driver(BaseModel):
    feature: str
    importance: float


class SupplierPrediction(BaseModel):
    supplier_id: str
    delay_probability: float          # 0-100
    expected_delay_days: float
    predicted_ppm: float | None
    ppm_breach_probability: float     # 0-100
    risk_level: str                   # low | medium | high | critical
    confidence: float                 # 0-100
    data_points: int
    drivers: list[Driver]


class DriftSummary(BaseModel):
    status: str
    max_psi: float
    drifted_features: list[str]


class PredictResponse(BaseModel):
    model_version: str
    predictions: list[SupplierPrediction]
    drift: DriftSummary | None = None
