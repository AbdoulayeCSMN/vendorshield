# VendorShield ML

Operational-risk prediction service for VendorShield: forecasts **delivery
delays** and **quality defects (PPM)** per supplier from their delivery history.

Deterministic, auditable models (LightGBM) served over a small FastAPI app. The
LLM in the main product only *explains* these numbers — it never produces them.

## Architecture

```
Supabase Postgres ──load──▶ features (leakage-safe) ──train──▶ artifacts (joblib + metadata)
                                                          │
                                          FastAPI /predict ◀── Predictor (calibrated proba + PSI drift)
                                                          ▲
                                   Next.js app ──HTTP (X-API-Key)──┘   (falls back to its TS model if down)
```

- **`data/`** — Supabase loader (+ synthetic generator for CI), pandera contracts.
- **`features/`** — expanding-window, leakage-safe engineering (single source of truth, reused at train & serve).
- **`models/`** — LightGBM pipelines (impute + model) + artifact registry.
- **`training/`** — temporal hold-out, OOF cross-validation, probability calibration, metrics (ROC-AUC / PR-AUC / Brier), MLflow tracking (optional), reference stats for drift.
- **`monitoring/`** — PSI drift detection vs the training distribution.
- **`serving/`** — FastAPI: `/health`, `/predict`, `/model/info`, `/reload`.

## MLOps

| Concern | Approach |
|---|---|
| Reproducibility | pinned deps, `random_state`, DVC `train` stage (`dvc repro`) |
| Experiment tracking | MLflow (file store by default, remote via `VS_ML_MLFLOW_TRACKING_URI`) |
| Data validation | pandera schema, fail-fast on load |
| Honest evaluation | temporal split + out-of-fold CV; calibrated probabilities |
| Explainability | SHAP per-instance drivers (falls back to global importances) |
| Monitoring | PSI drift returned on every `/predict` batch |
| CI | ruff + mypy + pytest (trains on synthetic data) — see `.github/workflows/ml-ci.yml` |
| Packaging | Docker image, deployable to Railway / Render / Cloud Run / Fly |

## Quickstart

```bash
make setup                      # uv venv + install (.[mlops,dev])
cp .env.example .env            # set VS_ML_DATABASE_URL (or leave empty for synthetic)
make train                      # trains, writes artifacts/ + metadata
make test                       # full suite (incl. a real training smoke test)
make serve                      # http://localhost:8000  (GET /health)
```

Predict (the shape the Next.js app sends):

```bash
curl -s localhost:8000/predict -H 'content-type: application/json' -d '{
  "deliveries": [
    {"supplier_id":"s1","planned_date":"2025-01-01","actual_date":"2025-01-04","ppm":4200,"quantity":500}
  ]
}'
```

## Deploy

```bash
docker build -t vendorshield-ml .
docker run -p 8000:8000 \
  -e VS_ML_DATABASE_URL=postgresql+psycopg://... \
  -e VS_ML_API_KEY=$SECRET \
  vendorshield-ml
```

Train in CI/cron (or once locally) and ship the `artifacts/` with the image, or
mount them. Point the Next.js app at the service with `ML_SERVICE_URL` and
`ML_SERVICE_API_KEY`; if unreachable it transparently falls back to its built-in
TypeScript model so the product never breaks.
