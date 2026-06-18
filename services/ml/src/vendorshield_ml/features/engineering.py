"""Leakage-safe feature engineering.

All per-supplier statistics are computed on a time-sorted frame using only
information available *before* each delivery (``shift()`` + ``expanding()``),
so no future label leaks into the training matrix.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from vendorshield_ml.data.schema import FEATURE_COLUMNS, TARGET_LATE

_DEFAULT_OTD = 0.85
_DEFAULT_LATE_RATE = 0.15


def _seasonality(dates: pd.Series) -> tuple[pd.Series, pd.Series]:
    angle = 2 * np.pi * dates.dt.month / 12
    return np.sin(angle), np.cos(angle)


def build_training_frame(raw: pd.DataFrame) -> pd.DataFrame:
    """Return a frame with FEATURE_COLUMNS + target (`late`) + identifiers."""
    df = raw.copy()
    df = df.sort_values(["supplier_id", "planned_date"]).reset_index(drop=True)

    df["delay_days"] = (df["actual_date"] - df["planned_date"]).dt.days
    # Rows without an actual date cannot be labelled — drop from training.
    df = df.dropna(subset=["delay_days"]).copy()
    df["delay_days"] = df["delay_days"].astype(int)
    df[TARGET_LATE] = (df["delay_days"] > 0).astype(int)

    by = df["supplier_id"]
    pos_delay = df["delay_days"].clip(lower=0)

    def prior_expanding_mean(s: pd.Series) -> pd.Series:
        return s.groupby(by).transform(lambda x: x.shift().expanding().mean())

    df["prior_delivery_count"] = df.groupby("supplier_id").cumcount()
    df["prior_otd"] = prior_expanding_mean(1 - df[TARGET_LATE]).fillna(_DEFAULT_OTD)
    df["prior_avg_delay"] = prior_expanding_mean(pos_delay).fillna(0.0)
    df["rolling3_late_rate"] = (
        df[TARGET_LATE]
        .groupby(by)
        .transform(lambda x: x.shift().rolling(3, min_periods=1).mean())
        .fillna(_DEFAULT_LATE_RATE)
    )

    df["prior_ppm_mean"] = prior_expanding_mean(df["ppm"].fillna(0.0)).fillna(0.0)
    df["ppm_trend"] = (
        df["ppm"].fillna(0.0).groupby(by).transform(lambda x: x.shift().diff()).fillna(0.0)
    )

    df["quantity"] = df["quantity"].fillna(0.0)
    prior_q_mean = prior_expanding_mean(df["quantity"])
    prior_q_std = (
        df["quantity"].groupby(by).transform(lambda x: x.shift().expanding().std())
    )
    df["quantity_zscore"] = ((df["quantity"] - prior_q_mean) / prior_q_std).replace(
        [np.inf, -np.inf], 0.0
    ).fillna(0.0)

    sin, cos = _seasonality(df["planned_date"])
    df["month_sin"], df["month_cos"] = sin, cos

    df["lead_time_days"] = (
        df.groupby("supplier_id")["planned_date"].diff().dt.days
    )
    df["lead_time_days"] = df["lead_time_days"].fillna(df["lead_time_days"].median()).fillna(30.0)

    keep = ["supplier_id", "planned_date", TARGET_LATE, *FEATURE_COLUMNS]
    return df[keep].reset_index(drop=True)


def latest_features_per_supplier(raw: pd.DataFrame) -> pd.DataFrame:
    """Feature vector for the *next* delivery of each supplier (inference).

    Uses the supplier's full history as the 'prior' window, and a typical
    upcoming order (median quantity, next month, median lead time).
    """
    df = raw.copy()
    df = df.sort_values(["supplier_id", "planned_date"])
    df["delay_days"] = (df["actual_date"] - df["planned_date"]).dt.days

    next_month = pd.Timestamp.today().normalize() + pd.DateOffset(months=1)
    angle = 2 * np.pi * next_month.month / 12

    records = []
    for sid, g in df.groupby("supplier_id"):
        labelled = g.dropna(subset=["delay_days"])
        n = len(labelled)
        late = (labelled["delay_days"] > 0).astype(int)
        pos_delay = labelled["delay_days"].clip(lower=0)
        ppm = g["ppm"].dropna()
        ppm_recent = ppm.tail(3)
        records.append(
            {
                "supplier_id": sid,
                "prior_otd": float(1 - late.mean()) if n else _DEFAULT_OTD,
                "prior_avg_delay": float(pos_delay.mean()) if n else 0.0,
                "prior_delivery_count": int(n),
                "rolling3_late_rate": float(late.tail(3).mean()) if n else _DEFAULT_LATE_RATE,
                "prior_ppm_mean": float(ppm.mean()) if len(ppm) else 0.0,
                "ppm_trend": float(ppm_recent.diff().mean()) if len(ppm_recent) > 1 else 0.0,
                "quantity": float(g["quantity"].median()) if g["quantity"].notna().any() else 0.0,
                "quantity_zscore": 0.0,
                "month_sin": float(np.sin(angle)),
                "month_cos": float(np.cos(angle)),
                "lead_time_days": float(g["planned_date"].diff().dt.days.median() or 30.0),
            }
        )

    out = pd.DataFrame.from_records(records).set_index("supplier_id")
    return out[FEATURE_COLUMNS]
