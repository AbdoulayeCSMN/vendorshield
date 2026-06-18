from __future__ import annotations


def test_training_produces_usable_model(trained_settings):
    s = trained_settings
    assert s.model_path.exists()
    assert s.metadata_path.exists()
    assert s.reference_stats_path.exists()


def test_delay_model_learns_signal(trained_settings):
    from vendorshield_ml.models.registry import load_json

    meta = load_json(trained_settings.metadata_path)
    test_metrics = meta["delay"].get("test") or meta["delay"].get("cv") or {}
    # Synthetic data carries a real signal → model should beat random.
    assert test_metrics.get("roc_auc", 0) > 0.6, test_metrics
