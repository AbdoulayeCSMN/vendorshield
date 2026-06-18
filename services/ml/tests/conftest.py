from __future__ import annotations

import pytest

from vendorshield_ml.config import Settings
from vendorshield_ml.data.synthetic import generate_deliveries
from vendorshield_ml.training.pipeline import run_training


@pytest.fixture(scope="session")
def deliveries():
    return generate_deliveries(n_suppliers=40, n_months=24, seed=7)


@pytest.fixture(scope="session")
def trained_settings(tmp_path_factory) -> Settings:
    artifacts = tmp_path_factory.mktemp("artifacts")
    settings = Settings(artifacts_dir=artifacts, database_url=None, random_state=7)
    run_training(settings)
    return settings
