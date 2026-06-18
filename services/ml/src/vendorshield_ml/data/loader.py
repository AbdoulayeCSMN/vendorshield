"""Load delivery history from Supabase Postgres (or synthetic fallback)."""

from __future__ import annotations

import pandas as pd

from vendorshield_ml.config import Settings
from vendorshield_ml.data.schema import validate_raw
from vendorshield_ml.data.synthetic import generate_deliveries
from vendorshield_ml.logging import get_logger

log = get_logger(__name__)

_QUERY = """
    SELECT account_id::text,
           supplier_id::text,
           planned_date,
           actual_date,
           ppm,
           quantity,
           status
    FROM public.supplier_deliveries
    WHERE supplier_id IS NOT NULL
      AND planned_date IS NOT NULL
"""


def load_deliveries(settings: Settings, *, allow_synthetic: bool = True) -> pd.DataFrame:
    """Return validated raw deliveries.

    Uses the database when ``database_url`` is configured, otherwise falls back
    to reproducible synthetic data (handy for CI / local smoke runs).
    """
    if settings.database_url:
        from sqlalchemy import create_engine

        log.info("Loading deliveries from database")
        engine = create_engine(settings.database_url)
        with engine.connect() as conn:
            df = pd.read_sql(_QUERY, conn, parse_dates=["planned_date", "actual_date"])
    elif allow_synthetic:
        log.warning("No database_url set — using synthetic deliveries")
        df = generate_deliveries(seed=settings.random_state)
    else:
        raise RuntimeError("database_url is required (allow_synthetic=False)")

    df = validate_raw(df)
    log.info("Loaded %d deliveries for %d suppliers", len(df), df["supplier_id"].nunique())
    return df
