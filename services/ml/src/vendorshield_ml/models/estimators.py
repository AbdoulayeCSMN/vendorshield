"""Estimator factories — sklearn Pipelines wrapping LightGBM.

Pipelines bundle imputation + model so preprocessing travels with the artifact
(no train/serve skew).
"""

from __future__ import annotations

from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline


def build_delay_classifier(random_state: int = 42) -> Pipeline:
    return Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="median")),
            (
                "model",
                LGBMClassifier(
                    n_estimators=300,
                    learning_rate=0.05,
                    num_leaves=31,
                    max_depth=-1,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    reg_lambda=1.0,
                    class_weight="balanced",
                    random_state=random_state,
                    n_jobs=-1,
                    verbose=-1,
                ),
            ),
        ]
    )


def build_ppm_regressor(random_state: int = 42) -> Pipeline:
    return Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="median")),
            (
                "model",
                LGBMRegressor(
                    n_estimators=300,
                    learning_rate=0.05,
                    num_leaves=31,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    reg_lambda=1.0,
                    random_state=random_state,
                    n_jobs=-1,
                    verbose=-1,
                ),
            ),
        ]
    )
