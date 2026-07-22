"""
ACTUWISE — services/data_loader.py
Chargement de tous les CSV outputs des notebooks en mémoire au démarrage.

Les DataFrames sont chargés une seule fois et réutilisés par tous les endpoints.
Si un fichier est manquant, un avertissement est loggué mais l'application continue.

Modules actifs    : 0, 1, 2, 3
Modules placeholder : 4, 6
"""

import os
import pandas as pd
import logging

logger = logging.getLogger("actuwise.data_loader")

# Répertoire contenant les CSV (configurable via .env)
DATA_DIR = os.getenv("DATA_DIR", "./data")


def _load_csv(filename: str, description: str) -> pd.DataFrame | None:
    """
    Charge un fichier CSV depuis DATA_DIR.
    Retourne None si le fichier n'existe pas (sans crash).
    """
    filepath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(filepath):
        logger.warning(f"[DATA] Fichier manquant : {filepath} ({description})")
        return None
    try:
        df = pd.read_csv(filepath)
        logger.info(f"[DATA] ✓ {filename} — {len(df)} lignes ({description})")
        return df
    except Exception as e:
        logger.error(f"[DATA] Erreur lecture {filename} : {e}")
        return None


def load_all_data() -> dict:
    """
    Charge tous les CSV outputs des notebooks en mémoire.
    Retourne un dictionnaire {nom_logique: DataFrame}.

    Modules 0-3 : chargement réel
    Modules 4-6 : placeholder (None)
    """
    data = {}

    # ============================================================
    # MODULE 1 — Analyse sinistralité
    # ============================================================
    data["sinistralite_par_annee"] = _load_csv(
        "sinistralite_par_annee.csv",
        "Sinistralité agrégée par année (Module 1)"
    )
    data["sinistralite_par_garantie"] = _load_csv(
        "sinistralite_par_garantie.csv",
        "Sinistralité par garantie (Module 1)"
    )
    data["serie_mensuelle"] = _load_csv(
        "serie_mensuelle.csv",
        "Série mensuelle nb_sinistres + cout_total 2018-2023 (Module 1)"
    )
    data["ratio_combine_par_annee"] = _load_csv(
        "ratio_combine_par_annee.csv",
        "Ratio combiné par année (Module 1)"
    )

    # ============================================================
    # MODULE 2 — Provisionnement
    # ============================================================

    # --- Méthodes actuarielles classiques ---
    data["resultats_CL"] = _load_csv(
        "resultats_CL.csv",
        "IBNR Chain-Ladder par année de survenance (Module 2)"
    )
    data["resultats_BF"] = _load_csv(
        "resultats_BF.csv",
        "IBNR Bornhuetter-Ferguson par année de survenance (Module 2)"
    )
    data["resultats_CC"] = _load_csv(
        "resultats_CC.csv",
        "IBNR Cape Cod par année de survenance (Module 2)"
    )
    data["stress_tests"] = _load_csv(
        "stress_tests.csv",
        "Scénarios stress tests (Favorable/Base/Adverse/Très adverse) (Module 2)"
    )
    data["triangle_cumul"] = _load_csv(
        "triangle_cumul.csv",
        "Triangle de développement cumulé (Module 2)"
    )
    data["facteurs_developpement"] = _load_csv(
        "facteurs_developpement.csv",
        "Facteurs de développement Chain-Ladder (Module 2)"
    )

    # --- ML Reserving ---
    data["resultats_XGB_reserving"] = _load_csv(
        "resultats_XGB_reserving.csv",
        "IBNR XGBoost Reserving (Module 2)"
    )
    data["benchmark_provisionnement"] = _load_csv(
        "benchmark_provisionnement.csv",
        "Benchmark CL vs BF vs CC vs XGBoost (Module 2)"
    )

    # ============================================================
    # MODULE 3 — Modélisation des risques
    # ============================================================
    data["benchmark_module3"] = _load_csv(
        "benchmark_module3.csv",
        "Benchmark GLM vs XGBoost vs CANN (Module 3.6)"
    )
    data["prime_pure_par_segment"] = _load_csv(
        "prime_pure_par_segment.csv",
        "Prime pure par segment (Module 3.6)"
    )
    data["lorenz_curve_data"] = _load_csv(
        "lorenz_curve_data.csv",
        "Données courbe de Lorenz (Module 3.6)"
    )
    data["shap_values_top10"] = _load_csv(
        "shap_values_top10.csv",
        "Top 10 features SHAP (Module 3.4)"
    )
    data["clusters_profils"] = _load_csv(
        "clusters_profils.csv",
        "Profils K-Means clusters (Module 3.3)"
    )
    data["ratio_combine_par_segment"] = _load_csv(
        "ratio_combine_par_segment.csv",
        "Ratio combiné par segment Usage × Énergie (Module 3.1)"
    )
    data["resultats_GLM"] = _load_csv(
        "resultats_GLM.csv",
        "Résultats GLM fréquence + sévérité (Module 3.2)"
    )
    data["resultats_XGB_risque"] = _load_csv(
        "resultats_XGB_risque.csv",
        "Résultats XGBoost risque (Module 3.3)"
    )
    data["resultats_CANN"] = _load_csv(
        "resultats_CANN.csv",
        "Résultats CANN (Module 3.5)"
    )

    # ============================================================
    # MODULE 4 — Séries temporelles (PLACEHOLDER)
    # ============================================================
    # Ces données seront disponibles quand le module sera implémenté
    data["decomposition_serie"] = None      # Notebook 4.1 — non implémenté
    data["benchmark_series_temp"] = None    # Notebook 4.2 — non implémenté
    data["benchmark_final_module4"] = None  # Notebook 4.3 — non implémenté
    data["previsions_2024"] = None          # Notebook 4.3 — non implémenté
    data["alertes_2024"] = None             # Notebook 4.3 — non implémenté

    logger.info(f"[DATA] Chargement terminé. {sum(1 for v in data.values() if v is not None)} / {len(data)} fichiers disponibles.")
    return data
