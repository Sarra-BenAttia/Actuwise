"""
ACTUWISE — routers/stats.py
Endpoints statistiques globales, résultats clés et KPIs du dashboard.

Endpoints :
  GET /api/stats           → Statistiques globales du portefeuille (page d'accueil)
  GET /api/resultats_cles  → 3 métriques phares pour la hero section
  GET /api/kpis            → 4 KPI cards du dashboard (Vue Générale)
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import pandas as pd
import logging
import os

logger = logging.getLogger("actuwise.stats")
router = APIRouter()


def _get_data(request: Request) -> dict:
    """Récupère le dictionnaire DATA depuis l'état de l'application."""
    return request.app.state.data


def _get_selections(request: Request) -> dict:
    """Récupère les sélections de modèles depuis l'état de l'application."""
    return request.app.state.model_selections


# ============================================================
# GET /api/stats — Statistiques globales du portefeuille
# Utilisé par la section "Données" de la page d'accueil Arsha
# ============================================================
@router.get("/stats")
async def get_stats(request: Request):
    """
    Retourne les statistiques générales du portefeuille automobile tunisien.
    Ces chiffres alimentent la section "Données" de la page d'accueil.
    """
    try:
        data = _get_data(request)

        # Calcul depuis la série mensuelle (Module 1)
        serie = data.get("serie_mensuelle")
        ratio_annee = data.get("ratio_combine_par_annee")
        sinistralite_garantie = data.get("sinistralite_par_garantie")

        # Statistiques de base (chiffres du cahier des charges)
        stats = {
            "nb_polices": 94852,
            "nb_sinistres": 64999,
            "periode": "2018-2023",
            "nb_annees": 6,
            "nb_modules": 7,
            "niveaux_ia": 4,
        }

        # Enrichissement depuis les données si disponibles
        if ratio_annee is not None and not ratio_annee.empty:
            try:
                df = ratio_annee.copy()
                df.columns = df.columns.str.strip().str.lower()
                # Chercher la colonne ratio combiné
                rc_col = next(
                    (c for c in df.columns if "ratio" in c and "combin" in c),
                    None
                )
                annee_col = next(
                    (c for c in df.columns if "ann" in c or "year" in c),
                    None
                )
                if rc_col and annee_col:
                    derniere = df.sort_values(annee_col).iloc[-1]
                    stats["ratio_combine_2023"] = round(float(derniere[rc_col]), 2)
                    stats["annee_recente"] = int(derniere[annee_col])
            except Exception as e:
                logger.warning(f"Calcul ratio combiné 2023 échoué : {e}")

        if sinistralite_garantie is not None and not sinistralite_garantie.empty:
            try:
                df = sinistralite_garantie.copy()
                df.columns = df.columns.str.strip().str.lower()
                nb_col = next(
                    (c for c in df.columns if "nb" in c or "nombre" in c or "count" in c),
                    None
                )
                if nb_col:
                    stats["nb_sinistres_total_calcule"] = int(df[nb_col].sum())
            except Exception as e:
                logger.warning(f"Calcul nb sinistres échoué : {e}")

        return {"status": "ok", "data": stats}

    except Exception as e:
        logger.error(f"Erreur endpoint /api/stats : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "data": None}
        )


# ============================================================
# GET /api/resultats_cles — 3 métriques phares (hero section)
# Utilisé par la section "Résultats clés" de la page d'accueil
# ============================================================
@router.get("/resultats_cles")
async def get_resultats_cles(request: Request):
    """
    Retourne les 3 métriques phares pour la section "Résultats clés" de l'accueil :
    1. Meilleur Gini Module 3 (modèle retenu)
    2. Réserve IBNR totale (modèle retenu Module 2)
    3. Ratio combiné prévu 2024 (Module 4 — placeholder)
    """
    try:
        data = _get_data(request)
        selections = _get_selections(request)

        resultats = {}

        # --- 1. Meilleur Gini Module 3 ---
        benchmark_m3 = data.get("benchmark_module3")
        sel_m3 = selections.get("module3", {})
        modele_retenu_m3 = sel_m3.get("modele_retenu", "XGBoost")
        gini_retenu = sel_m3.get("gini_retenu")

        if benchmark_m3 is not None and gini_retenu is None:
            try:
                df = benchmark_m3.copy()
                df.columns = df.columns.str.strip().str.lower()
                gini_col = next((c for c in df.columns if "gini" in c), None)
                if gini_col:
                    gini_retenu = float(df[gini_col].max())
            except Exception:
                pass

        resultats["gini"] = {
            "valeur": round(gini_retenu, 4) if gini_retenu else None,
            "modele": modele_retenu_m3,
            "label": "Gini — Meilleur modèle",
            "unite": "",
            "description": f"Coefficient de Gini du modèle retenu ({modele_retenu_m3}) pour la modélisation des risques"
        }

        # --- 2. Réserve IBNR totale (modèle retenu Module 2) ---
        sel_m2 = selections.get("module2", {})
        modele_retenu_m2 = sel_m2.get("modele_retenu", "Chain-Ladder")

        ibnr_total = None
        if modele_retenu_m2 == "XGBoost ML Reserving":
            df_ibnr = data.get("resultats_XGB_reserving")
        else:
            df_ibnr = data.get("resultats_CL")

        if df_ibnr is not None and not df_ibnr.empty:
            try:
                df = df_ibnr.copy()
                df.columns = df.columns.str.strip().str.lower()
                ibnr_col = next(
                    (c for c in df.columns if "ibnr" in c or "reserve" in c or "réserve" in c),
                    None
                )
                if ibnr_col:
                    ibnr_total = float(df[ibnr_col].sum())
            except Exception as e:
                logger.warning(f"Calcul IBNR total échoué : {e}")

        resultats["ibnr"] = {
            "valeur": round(ibnr_total, 0) if ibnr_total else None,
            "modele": modele_retenu_m2,
            "label": "Réserve IBNR Totale",
            "unite": "TND",
            "description": f"Réserve IBNR estimée par la méthode retenue ({modele_retenu_m2})"
        }

        # --- 3. Ratio combiné prévu 2024 (Module 4 — placeholder) ---
        resultats["ratio_combine_2024"] = {
            "valeur": None,
            "modele": None,
            "label": "Ratio Combiné Prévu 2024",
            "unite": "%",
            "description": "Prévision du ratio combiné 2024 (Module 4 non encore implémenté)",
            "status": "not_implemented"
        }

        return {"status": "ok", "data": resultats}

    except Exception as e:
        logger.error(f"Erreur endpoint /api/resultats_cles : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "data": None}
        )


# ============================================================
# GET /api/kpis — 4 KPI cards du dashboard
# Utilisé par la section "Vue Générale" du dashboard DeskApp
# ============================================================
@router.get("/kpis")
async def get_kpis(request: Request):
    """
    Retourne les 4 KPI cards du dashboard :
    1. Ratio combiné actuel 2023 (avec couleur selon seuil)
    2. Réserves IBNR totales (modèle retenu Module 2)
    3. Gini meilleur modèle (Module 3)
    4. Prévision ratio combiné 2024 (Module 4 — placeholder)
    """
    try:
        data = _get_data(request)
        selections = _get_selections(request)

        kpis = {}

        # --- KPI 1 : Ratio combiné 2023 ---
        ratio_annee = data.get("ratio_combine_par_annee")
        ratio_2023 = None
        if ratio_annee is not None and not ratio_annee.empty:
            try:
                df = ratio_annee.copy()
                df.columns = df.columns.str.strip().str.lower()
                rc_col = next(
                    (c for c in df.columns if "ratio" in c and "combin" in c),
                    None
                )
                annee_col = next(
                    (c for c in df.columns if "ann" in c or "year" in c),
                    None
                )
                if rc_col and annee_col:
                    derniere = df.sort_values(annee_col).iloc[-1]
                    ratio_2023 = round(float(derniere[rc_col]), 2)
            except Exception as e:
                logger.warning(f"KPI ratio combiné 2023 : {e}")

        # Couleur selon seuil : vert < 95%, orange 95-100%, rouge > 100%
        def couleur_ratio(rc):
            if rc is None:
                return "gray"
            if rc < 95:
                return "green"
            elif rc <= 100:
                return "orange"
            else:
                return "red"

        kpis["ratio_combine_2023"] = {
            "label": "Ratio Combiné 2023",
            "valeur": ratio_2023,
            "unite": "%",
            "couleur": couleur_ratio(ratio_2023),
            "interpretation": (
                "✅ Rentable" if ratio_2023 and ratio_2023 < 95 else
                "⚠️ Limite" if ratio_2023 and ratio_2023 <= 100 else
                "🔴 Perte technique" if ratio_2023 else "N/A"
            ),
            "icone": "trending-up"
        }

        # --- KPI 2 : Réserves IBNR ---
        sel_m2 = selections.get("module2", {})
        modele_m2 = sel_m2.get("modele_retenu", "Chain-Ladder")
        cle_m2 = sel_m2.get("cle_modele", "chain_ladder")

        if modele_m2 == "XGBoost ML Reserving":
            df_ibnr = data.get("resultats_XGB_reserving")
        else:
            df_ibnr = data.get("resultats_CL")

        ibnr_total = None
        if df_ibnr is not None and not df_ibnr.empty:
            try:
                df = df_ibnr.copy()
                df.columns = df.columns.str.strip().str.lower()
                ibnr_col = next(
                    (c for c in df.columns if "ibnr" in c or "reserve" in c or "réserve" in c),
                    None
                )
                if ibnr_col:
                    ibnr_total = float(df[ibnr_col].sum())
            except Exception as e:
                logger.warning(f"KPI IBNR : {e}")

        kpis["ibnr_total"] = {
            "label": "Réserves IBNR",
            "valeur": round(ibnr_total, 0) if ibnr_total else None,
            "unite": "TND",
            "modele": modele_m2,
            "couleur": "blue",
            "icone": "shield"
        }

        # --- KPI 3 : Gini meilleur modèle ---
        sel_m3 = selections.get("module3", {})
        modele_m3 = sel_m3.get("modele_retenu", "XGBoost")
        gini_retenu = sel_m3.get("gini_retenu")

        if gini_retenu is None:
            benchmark_m3 = data.get("benchmark_module3")
            if benchmark_m3 is not None and not benchmark_m3.empty:
                try:
                    df = benchmark_m3.copy()
                    df.columns = df.columns.str.strip().str.lower()
                    gini_col = next((c for c in df.columns if "gini" in c), None)
                    if gini_col:
                        gini_retenu = float(df[gini_col].max())
                except Exception:
                    pass

        kpis["gini_module3"] = {
            "label": "Gini — Modélisation Risques",
            "valeur": round(gini_retenu, 4) if gini_retenu else None,
            "unite": "",
            "modele": modele_m3,
            "couleur": "purple",
            "icone": "activity"
        }

        # --- KPI 4 : Prévision ratio combiné 2024 (placeholder) ---
        kpis["ratio_combine_2024"] = {
            "label": "Ratio Combiné Prévu 2024",
            "valeur": None,
            "unite": "%",
            "modele": None,
            "couleur": "gray",
            "icone": "calendar",
            "status": "not_implemented",
            "message": "Module 4 — Séries temporelles non encore implémenté"
        }

        return {"status": "ok", "data": kpis}

    except Exception as e:
        logger.error(f"Erreur endpoint /api/kpis : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "data": None}
        )
