"""
ACTUWISE — services/model_selector.py
Sélection automatique du meilleur modèle par module selon les benchmarks CSV.

Règles de sélection :
  Module 2 — Provisionnement :
    XGBoost si RMSE(XGBoost) < RMSE(Chain-Ladder), sinon Chain-Ladder
    Source : benchmark_provisionnement.csv

  Module 3 — Modélisation risques :
    CANN si Gini(CANN) > Gini(XGBoost) > Gini(GLM), sinon XGBoost
    Source : benchmark_module3.csv

  Module 4 — Séries temporelles (PLACEHOLDER) :
    LSTM si RMSE(LSTM) < RMSE(SARIMA), sinon SARIMA
    Source : benchmark_final_module4.csv
"""

import pandas as pd
import logging

logger = logging.getLogger("actuwise.model_selector")


# ============================================================
# MODULE 2 — Provisionnement
# ============================================================

def select_reserving_model(benchmark_df: pd.DataFrame | None) -> dict:
    """
    Sélectionne le meilleur modèle de provisionnement selon le RMSE.

    Args:
        benchmark_df : DataFrame du fichier benchmark_provisionnement.csv
                       Colonnes attendues : modele, rmse (ou RMSE), [mae, mape]

    Returns:
        dict avec :
          - modele_retenu : "XGBoost" ou "Chain-Ladder"
          - cle_modele   : clé dans le dictionnaire MODELS
          - rmse_retenu  : valeur RMSE du modèle retenu
          - rmse_cl      : RMSE Chain-Ladder pour comparaison
          - rmse_xgb     : RMSE XGBoost pour comparaison
          - raison       : explication de la sélection
    """
    # Valeurs par défaut si benchmark indisponible
    default = {
        "modele_retenu": "Chain-Ladder",
        "cle_modele": "chain_ladder",
        "rmse_retenu": None,
        "rmse_cl": None,
        "rmse_xgb": None,
        "raison": "Benchmark non disponible — Chain-Ladder retenu par défaut (méthode réglementaire)"
    }

    if benchmark_df is None or benchmark_df.empty:
        logger.warning("[SELECTOR M2] benchmark_provisionnement.csv non disponible → Chain-Ladder par défaut")
        return default

    try:
        # Normaliser les noms de colonnes (minuscules, sans espaces)
        df = benchmark_df.copy()
        df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

        # Chercher la colonne RMSE (plusieurs noms possibles)
        rmse_col = next(
            (c for c in df.columns if "rmse" in c.lower()),
            None
        )
        modele_col = next(
            (c for c in df.columns if "model" in c.lower() or "methode" in c.lower() or "modèle" in c.lower()),
            None
        )

        if rmse_col is None or modele_col is None:
            logger.warning(f"[SELECTOR M2] Colonnes attendues non trouvées. Colonnes disponibles : {list(df.columns)}")
            return default

        # Extraire les RMSE pour XGBoost et Chain-Ladder
        df_indexed = df.set_index(modele_col)[rmse_col].to_dict()

        # Chercher XGBoost (différentes orthographes possibles)
        rmse_xgb = next(
            (v for k, v in df_indexed.items() if "xgb" in k.lower() or "xgboost" in k.lower()),
            None
        )
        # Chercher Chain-Ladder
        rmse_cl = next(
            (v for k, v in df_indexed.items() if "chain" in k.lower() or "cl" in k.lower()),
            None
        )

        if rmse_xgb is None or rmse_cl is None:
            logger.warning(f"[SELECTOR M2] XGBoost ou Chain-Ladder non trouvé dans le benchmark : {list(df_indexed.keys())}")
            return default

        # Règle de sélection : XGBoost si RMSE plus faible
        if float(rmse_xgb) < float(rmse_cl):
            result = {
                "modele_retenu": "XGBoost ML Reserving",
                "cle_modele": "xgb_reserving",
                "rmse_retenu": float(rmse_xgb),
                "rmse_cl": float(rmse_cl),
                "rmse_xgb": float(rmse_xgb),
                "raison": f"XGBoost retenu : RMSE={rmse_xgb:.2f} < Chain-Ladder RMSE={rmse_cl:.2f}"
            }
        else:
            result = {
                "modele_retenu": "Chain-Ladder",
                "cle_modele": "chain_ladder",
                "rmse_retenu": float(rmse_cl),
                "rmse_cl": float(rmse_cl),
                "rmse_xgb": float(rmse_xgb),
                "raison": f"Chain-Ladder retenu : RMSE={rmse_cl:.2f} ≤ XGBoost RMSE={rmse_xgb:.2f}"
            }

        logger.info(f"[SELECTOR M2] {result['raison']}")
        return result

    except Exception as e:
        logger.error(f"[SELECTOR M2] Erreur sélection modèle provisionnement : {e}")
        return default


# ============================================================
# MODULE 3 — Modélisation des risques
# ============================================================

def select_risk_model(benchmark_df: pd.DataFrame | None) -> dict:
    """
    Sélectionne le meilleur modèle de modélisation des risques selon le Gini.

    Args:
        benchmark_df : DataFrame du fichier benchmark_module3.csv
                       Colonnes attendues : modele, gini (ou Gini), [rmse, auc, mae]

    Returns:
        dict avec :
          - modele_retenu : "CANN", "XGBoost" ou "GLM"
          - cle_modele_freq : clé modèle fréquence dans MODELS
          - cle_modele_sev  : clé modèle sévérité dans MODELS
          - gini_retenu  : valeur Gini du modèle retenu
          - gini_cann / gini_xgb / gini_glm : valeurs pour comparaison
          - raison       : explication de la sélection
    """
    default = {
        "modele_retenu": "XGBoost",
        "cle_modele_freq": "xgb_frequence",
        "cle_modele_sev": "xgb_severite",
        "gini_retenu": None,
        "gini_cann": None,
        "gini_xgb": None,
        "gini_glm": None,
        "raison": "Benchmark non disponible — XGBoost retenu par défaut"
    }

    if benchmark_df is None or benchmark_df.empty:
        logger.warning("[SELECTOR M3] benchmark_module3.csv non disponible → XGBoost par défaut")
        return default

    try:
        df = benchmark_df.copy()
        df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

        # Chercher la colonne Gini (plusieurs noms possibles)
        gini_col = next(
            (c for c in df.columns if "gini" in c.lower()),
            None
        )
        modele_col = next(
            (c for c in df.columns if "model" in c.lower() or "modèle" in c.lower() or "methode" in c.lower()),
            None
        )

        if gini_col is None or modele_col is None:
            logger.warning(f"[SELECTOR M3] Colonnes Gini/Modèle non trouvées. Disponibles : {list(df.columns)}")
            return default

        df_indexed = df.set_index(modele_col)[gini_col].to_dict()

        # Extraire Gini par modèle
        gini_cann = next(
            (v for k, v in df_indexed.items() if "cann" in k.lower()),
            None
        )
        gini_xgb = next(
            (v for k, v in df_indexed.items() if "xgb" in k.lower() or "xgboost" in k.lower()),
            None
        )
        gini_glm = next(
            (v for k, v in df_indexed.items() if "glm" in k.lower()),
            None
        )

        # Règle de sélection : CANN > XGBoost > GLM (selon Gini)
        if gini_cann is not None and gini_xgb is not None and float(gini_cann) > float(gini_xgb):
            result = {
                "modele_retenu": "CANN",
                "cle_modele_freq": "cann_model",
                "cle_modele_sev": "cann_model",
                "gini_retenu": float(gini_cann),
                "gini_cann": float(gini_cann) if gini_cann else None,
                "gini_xgb": float(gini_xgb) if gini_xgb else None,
                "gini_glm": float(gini_glm) if gini_glm else None,
                "raison": f"CANN retenu : Gini={gini_cann:.4f} > XGBoost Gini={gini_xgb:.4f}"
            }
        elif gini_xgb is not None:
            result = {
                "modele_retenu": "XGBoost",
                "cle_modele_freq": "xgb_frequence",
                "cle_modele_sev": "xgb_severite",
                "gini_retenu": float(gini_xgb),
                "gini_cann": float(gini_cann) if gini_cann else None,
                "gini_xgb": float(gini_xgb),
                "gini_glm": float(gini_glm) if gini_glm else None,
                "raison": f"XGBoost retenu : Gini={gini_xgb:.4f} (CANN non disponible ou inférieur)"
            }
        else:
            result = {**default,
                      "gini_cann": float(gini_cann) if gini_cann else None,
                      "gini_xgb": float(gini_xgb) if gini_xgb else None,
                      "gini_glm": float(gini_glm) if gini_glm else None}

        logger.info(f"[SELECTOR M3] {result['raison']}")
        return result

    except Exception as e:
        logger.error(f"[SELECTOR M3] Erreur sélection modèle risque : {e}")
        return default


# ============================================================
# MODULE 4 — Séries temporelles (PLACEHOLDER)
# ============================================================

def select_timeseries_model(benchmark_df: pd.DataFrame | None) -> dict:
    """
    PLACEHOLDER — Module 4 non encore implémenté.
    Sélectionnera LSTM si RMSE(LSTM) < RMSE(SARIMA), sinon SARIMA.

    Args:
        benchmark_df : DataFrame du fichier benchmark_final_module4.csv

    Returns:
        dict avec statut placeholder
    """
    return {
        "modele_retenu": None,
        "cle_modele": None,
        "rmse_retenu": None,
        "rmse_lstm": None,
        "rmse_sarima": None,
        "raison": "Module 4 non encore implémenté — placeholder",
        "status": "not_implemented"
    }


# ============================================================
# Fonction principale — sélectionne tous les modèles
# ============================================================

def select_all_models(data: dict) -> dict:
    """
    Sélectionne les meilleurs modèles pour chaque module.
    Appelée au démarrage après le chargement des données.

    Args:
        data : dictionnaire des DataFrames chargés par data_loader.py

    Returns:
        dict avec les sélections par module
    """
    selections = {}

    logger.info("[SELECTOR] Sélection automatique des meilleurs modèles...")

    # Module 2
    selections["module2"] = select_reserving_model(data.get("benchmark_provisionnement"))
    logger.info(f"[SELECTOR] Module 2 → {selections['module2']['modele_retenu']}")

    # Module 3
    selections["module3"] = select_risk_model(data.get("benchmark_module3"))
    logger.info(f"[SELECTOR] Module 3 → {selections['module3']['modele_retenu']}")

    # Module 4 (placeholder)
    selections["module4"] = select_timeseries_model(data.get("benchmark_final_module4"))
    logger.info(f"[SELECTOR] Module 4 → {selections['module4']['raison']}")

    return selections
