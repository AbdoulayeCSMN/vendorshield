"""FastAPI application — operational-risk prediction service."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException

from vendorshield_ml import __version__
from vendorshield_ml.config import get_settings
from vendorshield_ml.logging import get_logger
from vendorshield_ml.serving.inference import Predictor, deliveries_to_frame
from vendorshield_ml.serving.schemas import PredictRequest, PredictResponse

log = get_logger(__name__)

_state: dict[str, Predictor | None] = {"predictor": None}


def _load_predictor() -> None:
    try:
        _state["predictor"] = Predictor()
        log.info("Predictor loaded (model %s)", _state["predictor"].model_version)
    except Exception as exc:  # model not trained yet
        log.warning("Predictor unavailable: %s", exc)
        _state["predictor"] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_predictor()
    yield


app = FastAPI(title="VendorShield ML", version=__version__, lifespan=lifespan)


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if settings.api_key and x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


@app.get("/health")
def health() -> dict[str, object]:
    predictor = _state["predictor"]
    return {
        "status": "ok",
        "version": __version__,
        "model_loaded": predictor is not None,
        "model_version": predictor.model_version if predictor else None,
    }


@app.post("/reload")
def reload_model(_: None = Depends(require_api_key)) -> dict[str, str]:
    _load_predictor()
    return {"status": "reloaded"}


@app.get("/model/info")
def model_info() -> dict[str, object]:
    predictor = _state["predictor"]
    if predictor is None:
        raise HTTPException(status_code=503, detail="Model not trained")
    return predictor.metadata


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, _: None = Depends(require_api_key)) -> PredictResponse:
    predictor = _state["predictor"]
    if predictor is None:
        raise HTTPException(status_code=503, detail="Model not trained — run training first")

    frame = deliveries_to_frame([d.model_dump() for d in req.deliveries])
    result = predictor.predict(frame)
    return PredictResponse(**result)
