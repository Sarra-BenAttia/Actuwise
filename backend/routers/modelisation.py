"""
ACTUWISE — routers/modelisation.py
Module 3 — Modélisation des risques.

Endpoints :
  GET /api/modelisation/benchmark → Benchmark GLM vs XGBoost vs CANN + modèle retenu
  GET /api/modelisation/shap      → Valeurs SHAP top 10 + chemins figures
  GET /api/modelisation/segments  → Segmentation par Usage/Énergie + clusters K-Means
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import pandas as pd
import logging

logger = logging.getLogger("actuwise.modelisation")
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
# GET /api/modelisation/benchmark
# Benchmark des modèles GLM vs XGBoost vs CANN
# ============================================================
@router.get("/modelisation/benchmark")
async def get_benchmark(request: Request):
    """
    Retourne le benchmark complet des modèles de modélisation des risques :
    - Tableau : GLM vs XGBoost vs CANN (RMSE, Gini, AUC-ROC, MAE)
    - Modèle retenu selon Gini (sélection automatique)
    - Données courbe de Lorenz (3 modèles)
    """
    try:
        data = _get_data(request)
        selections = _get_selections(request)

        # --- Benchmark tableau ---
        benchmark_records = _df_to_records(data.get("benchmark_module3"))

        # --- Sélection automatique ---
        sel = selections.get("module3", {})
        modele_retenu = sel.get("modele_retenu", "XGBoost")
        gini_retenu = sel.get("gini_retenu")
        gini_cann = sel.get("gini_cann")
        gini_xgb = sel.get("gini_xgb")
        gini_glm = sel.get("gini_glm")
        raison = sel.get("raison", "")

        # --- Courbe de Lorenz ---
        lorenz_records = _df_to_records(data.get("lorenz_curve_data"))

        # --- Prime pure par segment ---
        prime_records = _df_to_records(data.get("prime_pure_par_segment"))

        # --- Figures ---
        figures = {
            "lorenz_curve": "/figures/lorenz_curve.png"
        }

        return {
            "status": "ok",
            "data": {
                "modele_retenu": modele_retenu,
                "raison_selection": raison,
                "gini": {
                    "retenu": gini_retenu,
                    "cann": gini_cann,
                    "xgboost": gini_xgb,
                    "glm": gini_glm
                },
                "benchmark": benchmark_records,
                "lorenz_curve": lorenz_records,
                "prime_pure_par_segment": prime_records,
                "figures": figures
            }
        }

    except Exception as e:
        logger.error(f"Erreur endpoint /api/modelisation/benchmark : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "data": None}
        )


# ============================================================
# GET /api/modelisation/shap
# Valeurs SHAP + figures explicabilité
# ============================================================
@router.get("/modelisation/shap")
async def get_shap(request: Request):
    """
    Retourne les valeurs SHAP pour l'explicabilité des modèles :
    - Top 10 features importantes (tableau)
    - Figures : shap_summary_frequence.png + shap_summary_severite.png
    """
    try:
        data = _get_data(request)

        # --- Top 10 SHAP features ---
        shap_records = _df_to_records(data.get("shap_values_top10"))

        # --- Figures SHAP ---
        figures = {
            "shap_frequence": "/figures/shap_summary_frequence.png",
            "shap_severite": "/figures/shap_summary_severite.png"
        }

        return {
            "status": "ok",
            "data": {
                "top10_features": shap_records,
                "figures": figures
            }
        }

    except Exception as e:
        logger.error(f"Erreur endpoint /api/modelisation/shap : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "data": None}
        )


# ============================================================
# GET /api/modelisation/segments
# Segmentation risques : Usage × Énergie + clusters K-Means
# ============================================================
@router.get("/modelisation/segments")
async def get_segments(request: Request):
    """
    Retourne les données de segmentation des risques :
    - Ratio combiné par segment (Usage × Énergie) avec badge rouge si > 100%
    - Profils clusters K-Means avec ratio combiné par cluster
    """
    try:
        data = _get_data(request)

        # --- Ratio combiné par segment ---
        segments_df = data.get("ratio_combine_par_segment")
        segments_records = _df_to_records(segments_df)

        # Identifier les segments en perte technique (ratio > 100%)
        segments_avec_alerte = []
        if segments_df is not None and not segments_df.empty:
            try:
                df = segments_df.copy()
                df.columns = df.columns.str.strip().str.lower()
                rc_col = next(
                    (c for c in df.columns if "ratio" in c and "combin" in c),
                    None
                )
                if rc_col:
                    df["alerte_perte"] = df[rc_col].apply(
                        lambda x: x > 100 if pd.notnull(x) else False
                    )
                    segments_avec_alerte = df.where(pd.notnull(df), None).to_dict(orient="records")
            except Exception as e:
                logger.warning(f"Calcul alertes segments : {e}")
                segments_avec_alerte = segments_records

        # --- Profils K-Means ---
        clusters_records = _df_to_records(data.get("clusters_profils"))

        # --- Résumé : segments en perte ---
        nb_segments_perte = sum(
            1 for s in segments_avec_alerte
            if s.get("alerte_perte", False)
        )

        return {
            "status": "ok",
            "data": {
                "segments": segments_avec_alerte if segments_avec_alerte else segments_records,
                "clusters": clusters_records,
                "nb_segments_en_perte": nb_segments_perte,
                "resume": f"{nb_segments_perte} segment(s) en perte technique (ratio > 100%)"
            }
        }

    except Exception as e:
        logger.error(f"Erreur endpoint /api/modelisation/segments : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "data": None}
        )
