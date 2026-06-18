"""Synthetic delivery generator — reproducible data for tests, CI and demos.

The generator injects a *learnable* signal: each supplier has a latent
reliability that drives both its lateness probability and its PPM level, plus
a mild seasonal effect and a slow PPM drift. This lets the training pipeline be
validated end-to-end without a live database.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def generate_deliveries(
    n_suppliers: int = 40,
    n_months: int = 24,
    seed: int = 42,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    account_id = "00000000-0000-0000-0000-000000000001"

    rows = []
    base = pd.Timestamp.today().normalize() - pd.DateOffset(months=n_months)

    for s in range(n_suppliers):
        supplier_id = f"11111111-0000-0000-0000-{s:012d}"
        # Latent reliability in [0.4, 0.98]; lower → later & more defects.
        reliability = float(rng.uniform(0.4, 0.98))
        ppm_base = (1.0 - reliability) * 9000 + rng.normal(0, 300)
        ppm_drift = rng.normal(0, 40)  # per-month drift
        typical_qty = float(rng.uniform(100, 1000))

        for m in range(n_months):
            planned = base + pd.DateOffset(months=m)
            season = 0.12 * np.sin(2 * np.pi * planned.month / 12)  # winter dips
            p_late = np.clip((1 - reliability) + season + rng.normal(0, 0.05), 0.01, 0.95)
            is_late = rng.random() < p_late
            delay = int(rng.integers(1, 18)) if is_late else int(rng.integers(-1, 1))
            actual = planned + pd.Timedelta(days=delay)
            ppm = max(0.0, ppm_base + ppm_drift * m + rng.normal(0, 400))
            qty = max(1.0, rng.normal(typical_qty, typical_qty * 0.2))

            rows.append(
                {
                    "account_id": account_id,
                    "supplier_id": supplier_id,
                    "planned_date": planned,
                    "actual_date": actual,
                    "ppm": round(ppm, 1),
                    "quantity": round(qty, 1),
                    "status": "delivered",
                }
            )

    df = pd.DataFrame(rows)
    return df.sort_values(["supplier_id", "planned_date"]).reset_index(drop=True)
