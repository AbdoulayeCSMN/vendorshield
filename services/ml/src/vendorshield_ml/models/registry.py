"""Artifact registry — versioned local store (and optional MLflow registry).

Local store is the source of truth for serving (a single joblib per model plus
JSON metadata). MLflow, when available, additionally tracks runs/metrics.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
from sklearn.pipeline import Pipeline

from vendorshield_ml.logging import get_logger

log = get_logger(__name__)


def save_model(model: Pipeline, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, path)
    log.info("Saved model → %s", path)


def load_model(path: Path) -> Pipeline:
    return joblib.load(path)


def save_json(data: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
