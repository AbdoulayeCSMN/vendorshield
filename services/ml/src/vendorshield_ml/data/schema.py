"""Data contracts (pandera). Fail fast and loudly on malformed inputs."""

from __future__ import annotations

try:  # pandera >= 0.20 exposes the pandas API under pandera.pandas
    import pandera.pandas as pa
    from pandera.pandas import Check, Column, DataFrameSchema
except ImportError:  # pragma: no cover - older pandera
    import pandera as pa
    from pandera import Check, Column, DataFrameSchema

# Raw delivery records as loaded from `supplier_deliveries`.
RAW_DELIVERY_SCHEMA = DataFrameSchema(
    {
        "account_id": Column(str, nullable=False),
        "supplier_id": Column(str, nullable=False),
        "planned_date": Column("datetime64[ns]", nullable=False),
        "actual_date": Column("datetime64[ns]", nullable=True),
        "ppm": Column(float, Check.ge(0), nullable=True, coerce=True),
        "quantity": Column(float, Check.ge(0), nullable=True, coerce=True),
    },
    strict=False,  # extra columns (status, import_id…) are tolerated
    coerce=True,
)

# Target label name used across the codebase.
TARGET_LATE = "late"

# Engineered feature columns fed to the model (order matters for SHAP/serving).
# Every feature is strictly *prior* information or known-at-order-time, so the
# training matrix is leakage-free.
FEATURE_COLUMNS = [
    "prior_otd",            # expanding on-time rate (shifted)
    "prior_avg_delay",      # expanding mean positive delay (shifted)
    "prior_delivery_count", # number of prior deliveries
    "rolling3_late_rate",   # late rate over last 3 (shifted)
    "prior_ppm_mean",       # expanding mean PPM (shifted) — not the realised PPM
    "ppm_trend",            # recent change in prior PPM
    "quantity",             # order quantity (known at order time)
    "quantity_zscore",      # per-supplier expanding z-score (shifted)
    "month_sin",            # seasonality
    "month_cos",
    "lead_time_days",       # gap since previous delivery
]


def validate_raw(df: "pa.typing.DataFrame") -> "pa.typing.DataFrame":  # noqa: F821
    return RAW_DELIVERY_SCHEMA.validate(df, lazy=True)
