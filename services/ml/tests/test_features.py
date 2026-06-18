from __future__ import annotations

from vendorshield_ml.data.schema import FEATURE_COLUMNS, TARGET_LATE
from vendorshield_ml.features.engineering import (
    build_training_frame,
    latest_features_per_supplier,
)


def test_training_frame_is_complete_and_leakage_safe(deliveries):
    frame = build_training_frame(deliveries)

    assert TARGET_LATE in frame.columns
    for col in FEATURE_COLUMNS:
        assert col in frame.columns
        assert frame[col].notna().all(), f"NaN in {col}"

    # Each supplier's first delivery has no prior history.
    firsts = frame.groupby("supplier_id").head(1)
    assert (firsts["prior_delivery_count"] == 0).all()


def test_latest_features_one_row_per_supplier(deliveries):
    feats = latest_features_per_supplier(deliveries)
    assert set(feats.columns) == set(FEATURE_COLUMNS)
    assert len(feats) == deliveries["supplier_id"].nunique()
    assert feats.notna().all().all()
