"""
Router Bonus-Malus - Simulateur de trajectoire BM.
POST /api/bonus-malus/simulate
Utilise xgb_freq.pkl (Module 3) pour predire la probabilite de sinistre.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
import pickle
import os
import logging

logger = logging.getLogger("actuwise.bonus_malus")
router = APIRouter(prefix="/bonus-malus", tags=["Bonus-Malus"])

_MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
_FREQ_MODEL_PATH = os.path.join(_MODEL_DIR, "xgb_freq.pkl")
_freq_model = None


def _get_freq_model():
    global _freq_model
    if _freq_model is None:
        with open(_FREQ_MODEL_PATH, "rb") as f:
            _freq_model = pickle.load(f)
    return _freq_model


class BonusMalusInput(BaseModel):
    classe_bm: float = Field(..., ge=0.5, le=3.5)
    anciennete_permis: float = Field(..., ge=0, le=60)
    nb_sinistres_3ans: int = Field(..., ge=0, le=20)
    puissance_fiscale: float = Field(..., ge=1, le=30)
    region: str = Field(...)
    prime_actuelle: float = Field(default=1000.0, ge=0)


BM_MIN = 0.50
BM_MAX = 3.50
BM_REDUCTION = 0.05
BM_INCREASE = 0.25


def _apply_bm_step(current_bm, has_claim):
    if has_claim:
        new_bm = current_bm + BM_INCREASE
    else:
        new_bm = current_bm - BM_REDUCTION
    return round(max(BM_MIN, min(BM_MAX, new_bm)), 2)


def _simulate_trajectory(bm_start, has_claims_per_year):
    traj = [bm_start]
    bm = bm_start
    for has_claim in has_claims_per_year:
        bm = _apply_bm_step(bm, has_claim)
        traj.append(bm)
    return traj


REGION_FREQ_MAP = {
    "TUNIS": 0.18, "ARIANA": 0.12, "BEN AROUS": 0.11, "MANOUBA": 0.08,
    "SFAX": 0.10, "SOUSSE": 0.09, "BIZERTE": 0.07, "NABEUL": 0.06,
    "MONASTIR": 0.05, "GABES": 0.04, "KAIROUAN": 0.03, "GAFSA": 0.03,
    "KASSERINE": 0.02, "SIDI BOUZID": 0.02, "MAHDIA": 0.02, "BEJA": 0.02,
    "JENDOUBA": 0.01, "SILIANA": 0.01, "KEF": 0.01, "KEBILI": 0.01,
    "MEDENINE": 0.01, "TATAOUINE": 0.01, "TOZEUR": 0.01, "ZAGHOUAN": 0.01,
}

EXPECTED_FEATURES = [
    "Usage_Promenade et affaire", "Energie_Essence", "region_freq",
    "age_conducteur", "anciennete_vehicule", "exposition", "age_manquant",
    "sexe_masculin", "Puissance fiscale", "Valeur venale", "Classe BM"
]

DEFAULTS = {
    "Usage_Promenade et affaire": 1,
    "Energie_Essence": 1,
    "region_freq": 0.09,
    "age_conducteur": 42.0,
    "anciennete_vehicule": 7.0,
    "exposition": 1.0,
    "age_manquant": 0,
    "sexe_masculin": 1,
    "Puissance fiscale": 6.0,
    "Valeur venale": 30000.0,
    "Classe BM": 1.0,
}


def _build_features(payload, classe_bm):
    region_upper = payload.region.upper().strip()
    region_freq_val = REGION_FREQ_MAP.get(region_upper, 0.05)
    age_conducteur = 18 + payload.anciennete_permis
    row = {f: DEFAULTS.get(f, 0) for f in EXPECTED_FEATURES}
    row["age_conducteur"] = age_conducteur
    row["Puissance fiscale"] = payload.puissance_fiscale
    row["Classe BM"] = classe_bm
    row["region_freq"] = region_freq_val
    row["exposition"] = 1.0
    return pd.DataFrame([row], columns=EXPECTED_FEATURES)


def _predict_proba(model, df, nb_sinistres):
    try:
        import xgboost as xgb
        dmat = xgb.DMatrix(df)
        pred = model.predict(dmat)[0]
        freq = float(max(0.0, min(10.0, pred)))
        proba = 1 - np.exp(-freq)
        return round(float(min(1.0, max(0.0, proba))), 4)
    except Exception as e:
        logger.warning(f"Erreur prediction: {e}. Heuristique.")
        return round(min(0.95, 0.10 + nb_sinistres * 0.08), 4)


@router.post("/simulate")
def simulate_bonus_malus(payload: BonusMalusInput):
    try:
        model = _get_freq_model()
        df = _build_features(payload, payload.classe_bm)
        proba = _predict_proba(model, df, payload.nb_sinistres_3ans)
    except Exception as e:
        logger.warning(f"Modele non disponible: {e}")
        proba = round(min(0.95, 0.10 + payload.nb_sinistres_3ans * 0.08), 4)

    bm0 = payload.classe_bm
    traj_no = _simulate_trajectory(bm0, [False, False, False])
    traj_one = _simulate_trajectory(bm0, [True, False, False])

    traj_prob = [bm0]
    bm = bm0
    for _ in range(3):
        bm_c = _apply_bm_step(bm, True)
        bm_n = _apply_bm_step(bm, False)
        bm = round(proba * bm_c + (1 - proba) * bm_n, 2)
        traj_prob.append(bm)

    def prime_var(bm_final):
        if bm0 == 0:
            return {"pct": 0, "valeur": 0, "prime_finale": payload.prime_actuelle}
        ratio = bm_final / bm0
        pct = round((ratio - 1) * 100, 1)
        val = round((bm_final - bm0) / bm0 * payload.prime_actuelle, 1)
        return {"pct": pct, "valeur": val, "prime_finale": round(payload.prime_actuelle * ratio, 1)}

    return {
        "proba_sinistre": proba,
        "classe_bm_actuelle": bm0,
        "prime_actuelle": payload.prime_actuelle,
        "scenarios": {
            "no_claim": {
                "label": "Aucun sinistre",
                "trajectory": traj_no,
                "bm_final": traj_no[-1],
                "prime_variation": prime_var(traj_no[-1]),
            },
            "one_claim": {
                "label": "1 sinistre responsable",
                "trajectory": traj_one,
                "bm_final": traj_one[-1],
                "prime_variation": prime_var(traj_one[-1]),
            },
            "probable": {
                "label": "Scenario probable (IA)",
                "trajectory": traj_prob,
                "bm_final": traj_prob[-1],
                "prime_variation": prime_var(traj_prob[-1]),
            },
        },
        "years": [0, 1, 2, 3],
    }
