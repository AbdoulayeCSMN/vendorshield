.PHONY: setup train serve score test lint type docker-build clean

setup:           ## Create venv and install (with mlops + dev extras)
	uv venv --python 3.12 .venv
	uv pip install --python .venv -e ".[mlops,dev]"

train:           ## Train models from the configured data source
	.venv/bin/vendorshield-ml train

serve:           ## Run the prediction API (http://localhost:8000)
	.venv/bin/vendorshield-ml serve --reload

score:           ## Score all suppliers and print predictions
	.venv/bin/vendorshield-ml score

test:
	.venv/bin/pytest

lint:
	.venv/bin/ruff check src tests

type:
	.venv/bin/mypy src

docker-build:
	docker build -t vendorshield-ml .

clean:
	rm -rf .venv .pytest_cache .ruff_cache .mypy_cache artifacts/mlruns
