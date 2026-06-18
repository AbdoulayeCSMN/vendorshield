"""Inference engine — loads artifacts once, scores a batch of suppliers."""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd

from vendorshield_ml.config import Settings, get_settings
from vendorshield_ml.data.schema import FEATURE_COLUMNS
from vendorshield_ml.features.engineering import latest_features_per_supplier
from vendorshield_ml.logging import get_logger
from vendorshield_ml.models.registry import load_json, load_model
from vendorshield_ml.monitoring.drift import compute_drift

log = get_logger(__name__)

try:  # optional explainability
    import shap

    _HAS_SHAP = True
except Exception:  # pragma: no cover
    _HAS_SHAP = False


def _sigmoid(z: float) -> float:
    if z < -30:
        return 0.0
    if z > 30:
        return 1.0
    return 1.0 / (1.0 + math.exp(-z))


def _risk_level(delay_pct: float, breach_pct: float) -> str:
    score = max(delay_pct, breach_pct)
    if score >= 70:
        return "critical"
    if score >= 45:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


class Predictor:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self.delay_model = load_model(self.settings.model_path)
        self.metadata = load_json(self.settings.metadata_path)
        self.reference_stats = (
            load_json(self.settings.reference_stats_path)
            if self.settings.reference_stats_path.exists()
            else {}
        )
        self.ppm_model = (
            load_model(self.settings.ppm_model_path)
            if self.settings.ppm_model_path.exists()
            else None
        )
        self.base_model = None
        base_path = self.settings.artifacts_dir / "delay_base.joblib"
        if base_path.exists():
            self.base_model = load_model(base_path)
        self.model_version = self.metadata.get("model_version", "unknown")

    @property
    def importances(self) -> dict[str, float]:
        return self.metadata.get("delay", {}).get("importances", {})

    def _drivers(self, features: pd.DataFrame) -> list[list[dict[str, Any]]]:
        """Per-instance top features (SHAP if available, else global importances)."""
        if _HAS_SHAP and self.base_model is not None:
            try:
                model = self.base_model.named_steps["model"]
                imputed = self.base_model.named_steps["impute"].transform(features)
                explainer = shap.TreeExplainer(model)
                shap_values = explainer.shap_values(imputed)
                if isinstance(shap_values, list):  # binary → list of 2
                    shap_values = shap_values[1]
                out = []
                for row in shap_values:
                    ranked = sorted(
                        zip(FEATURE_COLUMNS, row, strict=True),
                        key=lambda kv: abs(kv[1]),
                        reverse=True,
                    )[:3]
                    out.append([{"feature": f, "importance": float(v)} for f, v in ranked])
                return out
            except Exception as exc:  # pragma: no cover
                log.warning("SHAP failed, falling back to global importances: %s", exc)

        top = sorted(self.importances.items(), key=lambda kv: kv[1], reverse=True)[:3]
        glob = [{"feature": f, "importance": float(v)} for f, v in top]
        return [glob for _ in range(len(features))]

    def predict(self, deliveries: pd.DataFrame) -> dict[str, Any]:
        features = latest_features_per_supplier(deliveries)
        x = features[FEATURE_COLUMNS]

        proba = self.delay_model.predict_proba(x)[:, 1]
        ppm_pred = self.ppm_model.predict(x) if self.ppm_model is not None else None
        drivers = self._drivers(x)

        threshold = self.settings.ppm_breach_threshold
        predictions = []
        for i, (supplier_id, row) in enumerate(features.iterrows()):
            delay_pct = round(float(proba[i]) * 100, 1)
            expected_delay = round(float(proba[i]) * float(row["prior_avg_delay"]), 1)

            if ppm_pred is not None:
                pred_ppm = max(0.0, float(ppm_pred[i]))
                breach = round(_sigmoid((pred_ppm - threshold) / (0.25 * threshold)) * 100, 1)
            else:
                pred_ppm, breach = None, 0.0

            n = int(row["prior_delivery_count"])
            predictions.append(
                {
                    "supplier_id": str(supplier_id),
                    "delay_probability": delay_pct,
                    "expected_delay_days": expected_delay,
                    "predicted_ppm": round(pred_ppm) if pred_ppm is not None else None,
                    "ppm_breach_probability": breach,
                    "risk_level": _risk_level(delay_pct, breach),
                    "confidence": round(min(100.0, n / 30 * 100), 1),
                    "data_points": n,
                    "drivers": drivers[i],
                }
            )

        drift = (
            compute_drift(self.reference_stats, x) if self.reference_stats else None
        )
        return {
            "model_version": self.model_version,
            "predictions": predictions,
            "drift": (
                {
                    "status": drift["status"],
                    "max_psi": round(drift["max_psi"], 4),
                    "drifted_features": drift["drifted_features"],
                }
                if drift
                else None
            ),
        }


def deliveries_to_frame(records: list[dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(records)
    for col in ("planned_date", "actual_date"):
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    for col in ("ppm", "quantity"):
        if col not in df.columns:
            df[col] = np.nan
    return df
