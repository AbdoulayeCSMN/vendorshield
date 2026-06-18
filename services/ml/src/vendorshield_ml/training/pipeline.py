"""End-to-end training: load → featurize → split → CV → calibrate → evaluate → log.

Design choices for honesty:
- **Temporal hold-out**: the most recent 20% of deliveries are the test set, so
  metrics reflect forecasting the future, not interpolating the past.
- **Out-of-fold CV** on the train split for a variance-aware estimate.
- **Probability calibration** (Platt) so the delay probability is meaningful.
- A separate uncalibrated base model is kept for SHAP / feature importance.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from vendorshield_ml.config import Settings
from vendorshield_ml.data.loader import load_deliveries
from vendorshield_ml.data.schema import FEATURE_COLUMNS, TARGET_LATE
from vendorshield_ml.features.engineering import build_training_frame
from vendorshield_ml.logging import get_logger
from vendorshield_ml.models.estimators import build_delay_classifier, build_ppm_regressor
from vendorshield_ml.models.registry import save_json, save_model, utcnow_iso
from vendorshield_ml.training.metrics import classification_metrics, regression_metrics

log = get_logger(__name__)

# Optional MLOps deps — never required for training to succeed.
try:  # pragma: no cover - import guard
    import mlflow

    _HAS_MLFLOW = True
except Exception:  # pragma: no cover
    _HAS_MLFLOW = False

MODEL_VERSION = "operational-risk-lgbm-v1"


def _temporal_split(frame: pd.DataFrame, test_frac: float = 0.2) -> tuple[pd.DataFrame, pd.DataFrame]:
    ordered = frame.sort_values("planned_date").reset_index(drop=True)
    cut = int(len(ordered) * (1 - test_frac))
    return ordered.iloc[:cut].copy(), ordered.iloc[cut:].copy()


def _reference_stats(x: pd.DataFrame) -> dict[str, Any]:
    """Per-feature distribution summary used for drift (PSI) at inference time."""
    stats: dict[str, Any] = {}
    for col in FEATURE_COLUMNS:
        s = x[col].astype(float)
        quantiles = np.quantile(s, np.linspace(0, 1, 11)).tolist()
        stats[col] = {
            "mean": float(s.mean()),
            "std": float(s.std()),
            "quantiles": quantiles,
        }
    return stats


def _train_delay(frame: pd.DataFrame, settings: Settings) -> dict[str, Any]:
    train, test = _temporal_split(frame)
    x_train, y_train = train[FEATURE_COLUMNS], train[TARGET_LATE].to_numpy()
    x_test, y_test = test[FEATURE_COLUMNS], test[TARGET_LATE].to_numpy()

    # Out-of-fold CV estimate on the train split.
    n_pos = int(y_train.sum())
    folds = max(2, min(settings.cv_folds, n_pos, len(y_train) - n_pos))
    cv_metrics: dict[str, float] = {}
    if folds >= 2 and len(np.unique(y_train)) > 1:
        skf = StratifiedKFold(n_splits=folds, shuffle=True, random_state=settings.random_state)
        oof = cross_val_predict(
            build_delay_classifier(settings.random_state),
            x_train,
            y_train,
            cv=skf,
            method="predict_proba",
        )[:, 1]
        cv_metrics = classification_metrics(y_train, oof)

    # Calibrated production model (probabilities you can trust).
    base = build_delay_classifier(settings.random_state)
    calibrated = CalibratedClassifierCV(base, method="sigmoid", cv=max(2, min(3, folds)))
    calibrated.fit(x_train, y_train)

    test_metrics: dict[str, float] = {}
    if len(y_test) and len(np.unique(y_test)) > 1:
        proba_test = calibrated.predict_proba(x_test)[:, 1]
        test_metrics = classification_metrics(y_test, proba_test)

    # Refit on ALL data for deployment; keep an uncalibrated base for SHAP.
    final = CalibratedClassifierCV(
        build_delay_classifier(settings.random_state),
        method="sigmoid",
        cv=max(2, min(3, folds)),
    )
    full_x, full_y = frame[FEATURE_COLUMNS], frame[TARGET_LATE].to_numpy()
    final.fit(full_x, full_y)

    base_full = build_delay_classifier(settings.random_state)
    base_full.fit(full_x, full_y)
    importances = dict(
        zip(
            FEATURE_COLUMNS,
            (float(v) for v in base_full.named_steps["model"].feature_importances_),
            strict=True,
        )
    )

    save_model(final, settings.model_path)
    save_model(base_full, settings.artifacts_dir / "delay_base.joblib")

    return {
        "cv": cv_metrics,
        "test": test_metrics,
        "importances": importances,
        "n_samples": int(len(frame)),
        "reference_stats": _reference_stats(full_x),
    }


def _train_ppm(frame: pd.DataFrame, settings: Settings, raw: pd.DataFrame) -> dict[str, Any]:
    # Target = realised PPM (regression). Join PPM back onto the feature frame.
    merged = frame.merge(
        raw[["supplier_id", "planned_date", "ppm"]],
        on=["supplier_id", "planned_date"],
        how="left",
    ).dropna(subset=["ppm"])
    if len(merged) < 20:
        return {"skipped": True, "reason": "insufficient PPM data"}

    train, test = _temporal_split(merged)
    model = build_ppm_regressor(settings.random_state)
    model.fit(train[FEATURE_COLUMNS], train["ppm"].to_numpy())

    metrics: dict[str, float] = {}
    if len(test):
        pred = model.predict(test[FEATURE_COLUMNS])
        metrics = regression_metrics(test["ppm"].to_numpy(), pred)

    # Refit on all and persist.
    model.fit(merged[FEATURE_COLUMNS], merged["ppm"].to_numpy())
    save_model(model, settings.ppm_model_path)
    return {"test": metrics, "n_samples": int(len(merged))}


def run_training(settings: Settings) -> dict[str, Any]:
    raw = load_deliveries(settings)
    frame = build_training_frame(raw)
    if len(frame) < settings.min_supplier_history:
        raise RuntimeError(f"Not enough labelled deliveries ({len(frame)}) to train")

    log.info("Training on %d labelled deliveries", len(frame))
    delay_result = _train_delay(frame, settings)
    ppm_result = _train_ppm(frame, settings, raw)

    metadata = {
        "model_version": MODEL_VERSION,
        "trained_at": utcnow_iso(),
        "feature_columns": FEATURE_COLUMNS,
        "delay": {k: v for k, v in delay_result.items() if k != "reference_stats"},
        "ppm": ppm_result,
    }
    save_json(metadata, settings.metadata_path)
    save_json(delay_result["reference_stats"], settings.reference_stats_path)

    _log_mlflow(settings, metadata)

    log.info(
        "Training complete — delay test=%s, ppm test=%s",
        delay_result.get("test"),
        ppm_result.get("test"),
    )
    return metadata


def _log_mlflow(settings: Settings, metadata: dict[str, Any]) -> None:
    if not _HAS_MLFLOW:
        log.warning("mlflow not installed — skipping experiment tracking")
        return
    mlflow.set_tracking_uri(settings.resolved_mlflow_uri)
    mlflow.set_experiment(settings.mlflow_experiment)
    with mlflow.start_run():
        mlflow.set_tag("model_version", metadata["model_version"])
        for split in ("cv", "test"):
            for k, v in (metadata["delay"].get(split) or {}).items():
                mlflow.log_metric(f"delay_{split}_{k}", v)
        for k, v in (metadata["ppm"].get("test") or {}).items():
            mlflow.log_metric(f"ppm_test_{k}", v)
        mlflow.log_artifact(str(settings.metadata_path))
