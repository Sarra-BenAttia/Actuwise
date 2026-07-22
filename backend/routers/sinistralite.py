"""
ACTUWISE — routers/sinistralite.py
Module 1 — Analyse de la sinistralité.

Endpoints :
  GET /api/sinistralite → Données sinistralité : série mensuelle, par garantie, par année
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import pandas as pd
import logging

logger = logging.getLogger("actuwise.sinistralite")
router = APIRouter()


def _get_data(request: Request) -> dict:
    return request.app.state.data


def _df_to_records(df: pd.DataFrame | None) -> list:
    """Convertit un DataFrame en liste de dicts pour la sérialisation JSON."""
    if df is None or df.empty:
        return []
    # Remplacer les valeurs NaN par None pour JSON
    return df.where(pd.notnull(df), None).to_dict(orient="records")


# ============================================================
# GET /api/sinistralite — Données Module 1
# ============================================================
@router.get("/sinistralite")
async def get_sinistralite(request: Request):
    """
    Retourne toutes les données de sinistralité du Module 1 :
    - Série mensuelle 2018-2023 (nb_sinistres + cout_total)
    - Sinistralité par garantie (tableau)
    - Sinistralité par année
    - Ratio combiné par année
    """
    try:
        data = _get_data(request)

        # --- Série mensuelle ---
        serie = data.get("serie_mensuelle")
        serie_records = _df_to_records(serie)

        # --- Sinistralité par garantie ---
        par_garantie = data.get("sinistralite_par_garantie")
        garantie_records = _df_to_records(par_garantie)

        # --- Sinistralité par année ---
        par_annee = data.get("sinistralite_par_annee")
        annee_records = _df_to_records(par_annee)

        # --- Ratio combiné par année ---
        ratio = data.get("ratio_combine_par_annee")
        ratio_records = _df_to_records(ratio)

        # --- Calcul des métriques récapitulatives ---
        recap = {}
        if serie is not None and not serie.empty:
            df = serie.copy()
            df.columns = df.columns.str.strip().str.lower()
            # Total sinistres sur la période
            nb_col = next((c for c in df.columns if "nb" in c or "nombre" in c or "count" in c), None)
            cout_col = next((c for c in df.columns if "cout" in c or "montant" in c or "amount" in c), None)
            if nb_col:
                recap["nb_sinistres_total"] = int(df[nb_col].sum())
                recap["nb_sinistres_moyen_mensuel"] = round(float(df[nb_col].mean()), 1)
            if cout_col:
                recap["cout_total"] = round(float(df[cout_col].sum()), 2)
                recap["cout_moyen_mensuel"] = round(float(df[cout_col].mean()), 2)

        return {
            "status": "ok",
            "data": {
                "serie_mensuelle": serie_records,
                "par_garantie": garantie_records,
                "par_annee": annee_records,
                "ratio_combine_annuel": ratio_records,
                "recap": recap
            }
        }

    except Exception as e:
        logger.error(f"Erreur endpoint /api/sinistralite : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "data": None}
        )
