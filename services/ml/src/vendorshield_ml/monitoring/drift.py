"""Population Stability Index (PSI) drift detection.

Compares a live feature batch against the training reference distribution.
PSI < 0.1 = stable, 0.1–0.25 = moderate shift, > 0.25 = significant drift.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

PSI_MODERATE = 0.1
PSI_SIGNIFICANT = 0.25


def _psi_for_feature(reference_quantiles: list[float], actual: np.ndarray) -> float:
    edges = np.unique(reference_quantiles)
    if len(edges) < 2:
        return 0.0
    edges[0], edges[-1] = -np.inf, np.inf
    n_bins = len(edges) - 1

    # Expected = uniform across deciles by construction (10% each).
    expected = np.full(n_bins, 1.0 / n_bins)
    actual_counts, _ = np.histogram(actual, bins=edges)
    actual_dist = actual_counts / max(actual_counts.sum(), 1)

    eps = 1e-6
    expected = np.clip(expected, eps, None)
    actual_dist = np.clip(actual_dist, eps, None)
    return float(np.sum((actual_dist - expected) * np.log(actual_dist / expected)))


def compute_drift(reference_stats: dict[str, Any], features: pd.DataFrame) -> dict[str, Any]:
    per_feature: dict[str, float] = {}
    for col, stats in reference_stats.items():
        if col in features.columns:
            per_feature[col] = _psi_for_feature(
                stats["quantiles"], features[col].astype(float).to_numpy()
            )

    max_psi = max(per_feature.values(), default=0.0)
    status = (
        "significant"
        if max_psi > PSI_SIGNIFICANT
        else "moderate"
        if max_psi > PSI_MODERATE
        else "stable"
    )
    return {
        "status": status,
        "max_psi": max_psi,
        "per_feature": per_feature,
        "drifted_features": [c for c, v in per_feature.items() if v > PSI_SIGNIFICANT],
    }
