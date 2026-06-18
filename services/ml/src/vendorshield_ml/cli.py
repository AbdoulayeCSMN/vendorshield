"""Command-line entrypoint: train, serve, score."""

from __future__ import annotations

import argparse
import json

from vendorshield_ml.config import get_settings
from vendorshield_ml.logging import get_logger

log = get_logger(__name__)


def _cmd_train(_: argparse.Namespace) -> None:
    from vendorshield_ml.training.pipeline import run_training

    metadata = run_training(get_settings())
    print(json.dumps(metadata, indent=2, default=str))


def _cmd_serve(args: argparse.Namespace) -> None:
    import uvicorn

    uvicorn.run(
        "vendorshield_ml.serving.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


def _cmd_score(_: argparse.Namespace) -> None:
    from vendorshield_ml.data.loader import load_deliveries
    from vendorshield_ml.serving.inference import Predictor

    settings = get_settings()
    deliveries = load_deliveries(settings)
    result = Predictor(settings).predict(deliveries)
    print(json.dumps(result, indent=2, default=str))


def main() -> None:
    parser = argparse.ArgumentParser(prog="vendorshield-ml")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("train", help="Train models from the configured data source").set_defaults(
        func=_cmd_train
    )

    serve = sub.add_parser("serve", help="Run the FastAPI prediction service")
    serve.add_argument("--host", default="0.0.0.0")  # noqa: S104
    serve.add_argument("--port", type=int, default=8000)
    serve.add_argument("--reload", action="store_true")
    serve.set_defaults(func=_cmd_serve)

    sub.add_parser("score", help="Score all suppliers and print predictions").set_defaults(
        func=_cmd_score
    )

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
