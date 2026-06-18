"""Evaluation metrics — honest, calibration-aware."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    log_loss,
    mean_absolute_error,
    r2_score,
    roc_auc_score,
    root_mean_squared_error,
)


def classification_metrics(y_true: np.ndarray, proba: np.ndarray) -> dict[str, float]:
    # Guard against degenerate single-class folds.
    metrics: dict[str, float] = {
        "brier": float(brier_score_loss(y_true, proba)),
        "positive_rate": float(np.mean(y_true)),
    }
    if len(np.unique(y_true)) > 1:
        metrics["roc_auc"] = float(roc_auc_score(y_true, proba))
        metrics["pr_auc"] = float(average_precision_score(y_true, proba))
        metrics["log_loss"] = float(log_loss(y_true, proba, labels=[0, 1]))
    return metrics


def regression_metrics(y_true: np.ndarray, pred: np.ndarray) -> dict[str, float]:
    return {
        "mae": float(mean_absolute_error(y_true, pred)),
        "rmse": float(root_mean_squared_error(y_true, pred)),
        "r2": float(r2_score(y_true, pred)) if len(np.unique(y_true)) > 1 else 0.0,
    }
