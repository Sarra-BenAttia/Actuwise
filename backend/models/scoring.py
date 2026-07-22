"""
Chargement du modele et logique de scoring pour l'API FastAPI.
Importer `score_one(payload)` depuis les routes.
"""
import pandas as pd
import xgboost as xgb
from functools import lru_cache

from . import model_config as cfg


@lru_cache(maxsize=1)
def get_model() -> xgb.Booster:
    bst = xgb.Booster()
    bst.load_model(cfg.MODEL_PATH)
    return bst


def _validate(payload: dict) -> dict:
    errors = []
    for field, (lo, hi) in cfg.BOUNDS.items():
        key = field.lower().replace(" ", "_") if field not in payload else field
        val = payload.get(field) if field in payload else payload.get(key)
        if val is None or not (lo <= val <= hi):
            errors.append(f"{field} doit etre entre {lo} et {hi}")
    for field, allowed in cfg.CATEGORIES.items():
        val = payload.get(field)
        if val not in allowed:
            errors.append(f"{field}='{val}' invalide, valeurs autorisees: {allowed}")
    if errors:
        raise ValueError("; ".join(errors))
    return payload


def _to_dataframe(payload: dict) -> pd.DataFrame:
    row = {}
    for f in cfg.FEAT_NUM:
        v = payload.get(f)
        if v is None and f in cfg.MEDIANS:
            v = cfg.MEDIANS[f]
        row[f] = v
    for f in cfg.FEAT_CAT:
        row[f] = payload.get(f)
    df = pd.DataFrame([row])
    for c in cfg.FEAT_CAT:
        df[c] = df[c].astype("category")
    return df[cfg.FEATURE_ORDER]


def score_one(payload: dict) -> dict:
    """
    payload attendu :
    {
      "driver_age": 35, "vehicle_age": 5, "Puissance fiscale": 7,
      "Valeur venale": 45000, "Classe BM": 3,
      "Usage": "Promenade et affaire", "CLI_SEX": "M",
      "Region": "TUNIS", "Energie": "Essence"
    }
    """
    _validate(payload)
    X = _to_dataframe(payload)
    d = xgb.DMatrix(X, enable_categorical=True)
    pred = get_model().predict(d)[0]
    return {
        "prime_pure_predite": float(pred),
        "prime_pure_calibree": float(pred * cfg.CALIBRATION_FACTOR),
    }
