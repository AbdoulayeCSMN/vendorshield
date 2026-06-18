from __future__ import annotations

import numpy as np
import pandas as pd

from vendorshield_ml.monitoring.drift import compute_drift


def _ref_stats(values: np.ndarray) -> dict:
    return {"f": {"mean": float(values.mean()), "std": float(values.std()),
                  "quantiles": np.quantile(values, np.linspace(0, 1, 11)).tolist()}}


def test_no_drift_on_same_distribution():
    rng = np.random.default_rng(0)
    base = rng.normal(0, 1, 2000)
    ref = _ref_stats(base)
    out = compute_drift(ref, pd.DataFrame({"f": rng.normal(0, 1, 2000)}))
    assert out["status"] == "stable"
    assert out["max_psi"] < 0.1


def test_drift_detected_on_shift():
    rng = np.random.default_rng(0)
    ref = _ref_stats(rng.normal(0, 1, 2000))
    out = compute_drift(ref, pd.DataFrame({"f": rng.normal(5, 1, 2000)}))
    assert out["status"] == "significant"
    assert "f" in out["drifted_features"]
