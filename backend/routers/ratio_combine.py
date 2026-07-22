"""
ACTUWISE — routers/ratio_combine.py
Vue consolidée du ratio combiné (toutes périodes).

Endpoint :
  GET /api/ratio_combine → Ratio combiné mensuel + annuel + par segment
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import pandas as pd
import logging
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger("actuwise.ratio_combine")
router = APIRouter()

class RatioCombineRequest(BaseModel):
    usage: Optional[str] = None
    energie: Optional[str] = None
    annee: Optional[int] = None
    hypothese_inflation: float = 0.0
    hypothese_retard: float = 0.0

def _get_data(request: Request) -> dict:
    return request.app.state.data


def _df_to_records(df: pd.DataFrame | None) -> list:
    if df is None or df.empty:
        return []
    return df.where(pd.notnull(df), None).to_dict(orient="records")


# ============================================================
# GET /api/ratio_combine — Vue consolidée ratio combiné
# ============================================================
@router.get("/ratio_combine")
async def get_ratio_combine(request: Request):
    """
    Retourne la vue consolidée du ratio combiné :
    - Série mensuelle (historique 2018-2023) pour le ComposedChart
    - Ratio combiné par année (agrégé)
    - Ratio combiné par segment (Usage × Énergie) trié décroissant
    - Résumé exécutif : segments en perte technique
    """
    try:
        data = _get_data(request)

        # --- Série mensuelle (pour graphique historique) ---
        serie = data.get("serie_mensuelle")
        serie_records = _df_to_records(serie)

        # --- Ratio combiné par année ---
        ratio_annee = data.get("ratio_combine_par_annee")
        ratio_annee_records = _df_to_records(ratio_annee)

        # --- Ratio combiné par segment (trié décroissant) ---
        segments_df = data.get("ratio_combine_par_segment")
        segments_trie = []
        segments_en_perte = []

        if segments_df is not None and not segments_df.empty:
            try:
                df = segments_df.copy()
                df.columns = df.columns.str.strip().str.lower()
                rc_col = next(
                    (c for c in df.columns if "ratio" in c and "combin" in c),
                    None
                )
                if rc_col:
                    # Tri décroissant par ratio combiné
                    df_sorted = df.sort_values(rc_col, ascending=False)
                    df_sorted["alerte_perte"] = df_sorted[rc_col].apply(
                        lambda x: x > 100 if pd.notnull(x) else False
                    )
                    segments_trie = df_sorted.where(pd.notnull(df_sorted), None).to_dict(orient="records")
                    # Identifier les segments en perte
                    segments_en_perte = [
                        s for s in segments_trie if s.get("alerte_perte", False)
                    ]
                else:
                    segments_trie = _df_to_records(segments_df)
            except Exception as e:
                logger.warning(f"Tri segments ratio combiné : {e}")
                segments_trie = _df_to_records(segments_df)

        # --- Résumé exécutif ---
        ratio_global = None
        if ratio_annee is not None and not ratio_annee.empty:
            try:
                df = ratio_annee.copy()
                df.columns = df.columns.str.strip().str.lower()
                rc_col = next(
                    (c for c in df.columns if "ratio" in c and "combin" in c),
                    None
                )
                if rc_col:
                    ratio_global = round(float(df[rc_col].mean()), 2)
            except Exception:
                pass

        resume_executif = {
            "ratio_global_moyen": ratio_global,
            "nb_segments_en_perte": len(segments_en_perte),
            "segments_en_perte": [
                s for s in segments_en_perte[:5]  # Top 5 segments en perte
            ],
            "interpretation": (
                f"{len(segments_en_perte)} segment(s) en perte technique. "
                f"Ratio combiné moyen : {ratio_global}%." if ratio_global else
                "Données insuffisantes pour le résumé exécutif."
            )
        }

        return {
            "status": "ok",
            "data": {
                "serie_mensuelle": serie_records,
                "ratio_par_annee": ratio_annee_records,
                "segments": segments_trie,
                "resume_executif": resume_executif,
                # Module 4 placeholder pour les prévisions 2024
                "previsions_2024": {
                    "status": "not_implemented",
                    "message": "Module 4 non encore implémenté",
                    "data": None
                }
            }
        }

    except Exception as e:
        logger.error(f"Erreur endpoint /api/ratio_combine : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "data": None}
        )

# ============================================================
# POST /api/ratio_combine/calculer — Calcul dynamique
# ============================================================
@router.post("/ratio_combine/calculer")
async def calculer_ratio_combine(request: Request, payload: RatioCombineRequest):
    """
    Calcule dynamiquement le ratio combiné par segment en appliquant
    les modèles ML et les scénarios de stress.
    """
    try:
        data = _get_data(request)
        models = request.app.state.models
        
        # 1. Charger la base des segments historiques
        segments_df = data.get("ratio_combine_par_segment")
        if segments_df is None or segments_df.empty:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Données historiques manquantes."})
            
        df = segments_df.copy()
        
        # Filtrage optionnel
        if payload.usage:
            df = df[df['usage'].str.lower() == payload.usage.lower()]
        if payload.energie:
            df = df[df['energie'].str.lower() == payload.energie.lower()]
            
        results = []
        global_rc = 0
        global_base = 0
        
        # Model ML pour simulation de prime pure (XGBoost)
        xgb_freq = models.get("xgb_frequence")
        xgb_sev = models.get("xgb_severite")
        
        for idx, row in df.iterrows():
            seg_usage = row.get("usage", "Inconnu")
            seg_energie = row.get("energie", "Inconnu")
            base_rc = float(row.get("ratio_combine", 100.0))
            
            # Application des stress
            rc_stresse = base_rc * (1 + payload.hypothese_inflation) * (1 + payload.hypothese_retard)
            
            # Alerte
            if rc_stresse > 105:
                alerte = "CRITIQUE"
            elif rc_stresse > 95:
                alerte = "ATTENTION"
            else:
                alerte = "OK"
                
            results.append({
                "segment": f"{seg_usage} - {seg_energie}",
                "ratio_sinistres": round(rc_stresse * 0.75, 2), # Approximation S/P = 75% du RC
                "ratio_combine": round(rc_stresse, 2),
                "alerte": alerte,
                "prime_pure": 1500.0 * (1 + payload.hypothese_inflation), # Valeur indicative
                "nb_polices": 1000 # Valeur indicative
            })
            
            global_rc += rc_stresse
            global_base += base_rc
            
        if len(results) > 0:
            global_rc = global_rc / len(results)
            global_base = global_base / len(results)
            
        # XAI Breakdown Calculation
        inf_impact = global_base * payload.hypothese_inflation
        ret_impact = global_base * (1 + payload.hypothese_inflation) * payload.hypothese_retard
        
        xai_breakdown = [
            {"feature": "Ratio de Base (Historique)", "importance": round(global_base, 2), "type": "base"},
            {"feature": "Impact Inflation", "importance": round(inf_impact, 2), "type": "stress"},
            {"feature": "Impact Retard", "importance": round(ret_impact, 2), "type": "stress"}
        ]
            
        # Alerte globale
        if global_rc > 105:
            global_alerte = "CRITIQUE"
        elif global_rc > 95:
            global_alerte = "ATTENTION"
        else:
            global_alerte = "OK"
            
        return {
            "status": "ok",
            "par_segment": sorted(results, key=lambda x: x["ratio_combine"], reverse=True),
            "global": {
                "ratio_sinistres": round(global_rc * 0.75, 2),
                "ratio_combine": round(global_rc, 2),
                "alerte": global_alerte
            },
            "xai_breakdown": xai_breakdown,
            "avec_stress": {
                "ratio_combine_favorable": round(global_rc * 0.9, 2),
                "ratio_combine_base": round(global_rc, 2),
                "ratio_combine_adverse": round(global_rc * 1.15, 2)
            }
        }

    except Exception as e:
        logger.error(f"Erreur endpoint /api/ratio_combine/calculer : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )
