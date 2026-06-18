# ── VendorShield ML service — deployable anywhere (Railway/Render/Cloud Run/Fly) ──
FROM python:3.12-slim AS base

# libgomp1 is required by LightGBM at runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first for better layer caching.
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --upgrade pip && pip install .

# Artifacts are mounted or baked in at deploy time (run `vendorshield-ml train`).
COPY artifacts ./artifacts

EXPOSE 8000

# Container platforms inject $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn vendorshield_ml.serving.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
