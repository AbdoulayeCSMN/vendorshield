"""Centralised, environment-driven configuration (12-factor)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo-relative default locations for artifacts / tracking.
_PACKAGE_ROOT = Path(__file__).resolve().parents[2]  # services/ml


class Settings(BaseSettings):
    """Runtime settings. All overridable via env (prefix VS_ML_)."""

    model_config = SettingsConfigDict(
        env_prefix="VS_ML_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Data source ──────────────────────────────────────────────────────────
    # SQLAlchemy DSN to the Supabase Postgres (read-only is enough for training).
    # e.g. postgresql+psycopg://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres
    database_url: str | None = Field(default=None)

    # ── Artifacts & tracking ─────────────────────────────────────────────────
    artifacts_dir: Path = Field(default=_PACKAGE_ROOT / "artifacts")
    mlflow_tracking_uri: str | None = Field(default=None)  # falls back to file store
    mlflow_experiment: str = Field(default="vendorshield-operational-risk")

    # ── Modelling ────────────────────────────────────────────────────────────
    # Minimum labelled deliveries (per supplier) below which we abstain.
    min_supplier_history: int = Field(default=8)
    # PPM threshold considered a quality breach.
    ppm_breach_threshold: float = Field(default=5000.0)
    random_state: int = Field(default=42)
    cv_folds: int = Field(default=5)

    # ── Serving ──────────────────────────────────────────────────────────────
    api_key: str | None = Field(default=None)  # if set, required on /predict
    model_name: str = Field(default="delay_classifier")

    @property
    def model_path(self) -> Path:
        return self.artifacts_dir / "delay_classifier.joblib"

    @property
    def ppm_model_path(self) -> Path:
        return self.artifacts_dir / "ppm_regressor.joblib"

    @property
    def metadata_path(self) -> Path:
        return self.artifacts_dir / "model_metadata.json"

    @property
    def reference_stats_path(self) -> Path:
        # Reference feature distribution for drift monitoring.
        return self.artifacts_dir / "reference_stats.json"

    @property
    def resolved_mlflow_uri(self) -> str:
        if self.mlflow_tracking_uri:
            return self.mlflow_tracking_uri
        return f"file:{(self.artifacts_dir / 'mlruns').as_posix()}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
