"""
ACTUWISE — routers/provisionnement.py
Module 2 — Provisionnement actuariel.

Endpoints :
  GET /api/provisionnement/classique → Méthodes CL + BF + Cape Cod + triangle
  GET /api/provisionnement/ml        → ML Reserving (XGBoost) + modèle retenu
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import pandas as pd
import logging
import os

logger = logging.getLogger("actuwise.provisionnement")
router = APIRouter()


def _get_data(request: Request) -> dict:
    return request.app.state.data


def _get_selections(request: Request) -> dict:
    return request.app.state.model_selections


def _df_to_records(df: pd.DataFrame | None) -> list:
    if df is None or df.empty:
        return []
    return df.where(pd.notnull(df), None).to_dict(orient="records")


# ============================================================
# GET /api/provisionnement/classique
# Méthodes actuarielles classiques : CL, BF, Cape Cod
# ============================================================
@router.get("/provisionnement/classique")
async def get_provisionnement_classique(request: Request):
    """
    Retourne les résultats des méthodes de provisionnement classiques :
    - Résultats Chain-Ladder (IBNR par année de survenance)
    - Résultats Bornhuetter-Ferguson
    - Résultats Cape Cod
    - Triangle de développement cumulé
    - Facteurs de développement
    - Stress tests (scénarios)
    """
    try:
        data = _get_data(request)

        # --- Résultats par méthode ---
        cl_records = _df_to_records(data.get("resultats_CL"))
        bf_records = _df_to_records(data.get("resultats_BF"))
        cc_records = _df_to_records(data.get("resultats_CC"))
        triangle_records = _df_to_records(data.get("triangle_cumul"))
        facteurs_records = _df_to_records(data.get("facteurs_developpement"))
        stress_records = _df_to_records(data.get("stress_tests"))

        # --- Calcul IBNR total par méthode ---
        totaux = {}
        for nom, df in [
            ("chain_ladder", data.get("resultats_CL")),
            ("bornhuetter_ferguson", data.get("resultats_BF")),
            ("cape_cod", data.get("resultats_CC"))
        ]:
            if df is not None and not df.empty:
                try:
                    dfc = df.copy()
                    dfc.columns = dfc.columns.str.strip().str.lower()
                    ibnr_col = next(
                        (c for c in dfc.columns if "ibnr" in c or "reserve" in c or "réserve" in c),
                        None
                    )
                    if ibnr_col:
                        totaux[nom] = round(float(dfc[ibnr_col].sum()), 2)
                except Exception as e:
                    logger.warning(f"Calcul IBNR total {nom} : {e}")

        # --- URL des figures statiques ---
        figures_base = "/figures"
        figures = {
            "triangle_heatmap": f"{figures_base}/triangle_heatmap.png"
        }

        return {
            "status": "ok",
            "data": {
                "chain_ladder": cl_records,
                "bornhuetter_ferguson": bf_records,
                "cape_cod": cc_records,
                "triangle_cumul": triangle_records,
                "facteurs_developpement": facteurs_records,
                "stress_tests": stress_records,
                "ibnr_totaux": totaux,
                "figures": figures
            }
        }

    except Exception as e:
        logger.error(f"Erreur endpoint /api/provisionnement/classique : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "data": None}
        )


# ============================================================
# GET /api/provisionnement/ml
# ML Reserving — XGBoost + sélection automatique du modèle retenu
# ============================================================
@router.get("/provisionnement/ml")
async def get_provisionnement_ml(request: Request):
    """
    Retourne les résultats du ML Reserving et le modèle retenu :
    - Résultats XGBoost Reserving (IBNR par année)
    - Benchmark complet (CL vs BF vs CC vs XGBoost)
    - Modèle retenu selon RMSE (sélection automatique)
    - Intervalles de confiance Bootstrap 95%
    - Figures : tornado chart
    """
    try:
        data = _get_data(request)
        selections = _get_selections(request)

        # --- Sélection automatique du modèle ---
        sel = selections.get("module2", {})
        modele_retenu = sel.get("modele_retenu", "Chain-Ladder")
        rmse_retenu = sel.get("rmse_retenu")
        rmse_cl = sel.get("rmse_cl")
        rmse_xgb = sel.get("rmse_xgb")
        raison = sel.get("raison", "Sélection par défaut")

        # --- Résultats XGBoost ---
        xgb_records = _df_to_records(data.get("resultats_XGB_reserving"))

        # --- Benchmark complet ---
        benchmark_records = _df_to_records(data.get("benchmark_provisionnement"))

        # --- IBNR total du modèle retenu ---
        ibnr_retenu = None
        if modele_retenu == "XGBoost ML Reserving":
            df_ret = data.get("resultats_XGB_reserving")
        else:
            df_ret = data.get("resultats_CL")

        if df_ret is not None and not df_ret.empty:
            try:
                dfc = df_ret.copy()
                dfc.columns = dfc.columns.str.strip().str.lower()
                ibnr_col = next(
                    (c for c in dfc.columns if "ibnr" in c or "reserve" in c or "réserve" in c),
                    None
                )
                if ibnr_col:
                    ibnr_retenu = round(float(dfc[ibnr_col].sum()), 2)
            except Exception as e:
                logger.warning(f"Calcul IBNR retenu : {e}")

        # --- Figures ---
        figures = {
            "tornado_chart": "/figures/tornado_chart.png"
        }

        return {
            "status": "ok",
            "data": {
                "modele_retenu": modele_retenu,
                "raison_selection": raison,
                "metriques": {
                    "rmse_retenu": rmse_retenu,
                    "rmse_chain_ladder": rmse_cl,
                    "rmse_xgboost": rmse_xgb
                },
                "ibnr_total_retenu": ibnr_retenu,
                "resultats_xgboost": xgb_records,
                "benchmark": benchmark_records,
                "figures": figures
            }
        }

    except Exception as e:
        logger.error(f"Erreur endpoint /api/provisionnement/ml : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "data": None}
        )
