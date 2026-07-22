"""
ACTUWISE — routers/prediction.py
Endpoints de prédiction temps réel.

POST /api/predict/assure    → Prime pure pour un assuré (Module 3)
POST /api/predict/reserving → Réserves pour un triangle partiel (Module 2)
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger("actuwise.prediction")
router = APIRouter()


def _get_models(request: Request) -> dict:
    return request.app.state.models


def _get_data(request: Request) -> dict:
    return request.app.state.data


def _get_selections(request: Request) -> dict:
    return request.app.state.model_selections


# ============================================================
# Schémas Pydantic — Validation des entrées
# ============================================================

class AssureInput(BaseModel):
    """Profil de l'assuré pour le calcul de la prime pure."""
    age_conducteur: int = Field(..., ge=18, le=99, description="Âge du conducteur (18-99)")
    classe_bm: int = Field(..., ge=1, le=22, description="Classe Bonus-Malus (1-22)")
    puissance_fiscale: int = Field(..., ge=1, le=30, description="Puissance fiscale du véhicule")
    region: str = Field(..., description="Région de l'assuré (ex: Tunis, Sfax, ...)")
    usage: str = Field(..., description="Usage du véhicule (ex: Privé, Commercial, ...)")
    energie: str = Field(..., description="Type d'énergie (ex: Essence, Diesel, ...)")
    anciennete_vehicule: Optional[int] = Field(None, ge=0, le=50, description="Ancienneté du véhicule en années")

    class Config:
        json_schema_extra = {
            "example": {
                "age_conducteur": 35,
                "classe_bm": 13,
                "puissance_fiscale": 7,
                "region": "Tunis",
                "usage": "Privé",
                "energie": "Diesel",
                "anciennete_vehicule": 5
            }
        }


class ReservingInput(BaseModel):
    """Triangle de développement partiel pour l'estimation des réserves."""
    triangle_data: List[List[Optional[float]]] = Field(
        ...,
        description="Matrice du triangle de développement (lignes=années, colonnes=périodes de dev)"
    )
    annees_survenance: Optional[List[int]] = Field(
        None,
        description="Liste des années de survenance (ex: [2018, 2019, 2020, 2021, 2022, 2023])"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "triangle_data": [
                    [1000, 1500, 1700, 1800, 1850],
                    [1200, 1800, 2100, 2200, None],
                    [1100, 1600, 1900, None, None],
                    [1300, 1900, None, None, None],
                    [900, None, None, None, None]
                ],
                "annees_survenance": [2019, 2020, 2021, 2022, 2023]
            }
        }


# ============================================================
# Fonctions utilitaires de prédiction
# ============================================================

def _encode_assure(profil: AssureInput) -> pd.DataFrame:
    """
    Encode le profil assuré en DataFrame pour la prédiction XGBoost.
    Colonnes exactes attendues : 
    ['Usage_Promenade et affaire' 'Energie_Essence' 'region_freq' 
     'age_conducteur' 'anciennete_vehicule' 'exposition' 'age_manquant' 
     'sexe_masculin' 'Puissance fiscale' 'Valeur venale' 'Classe BM']
    """
    # Encodage région approximatif (fréquence moyenne régionale)
    region_freq_map = {
        "Tunis": 0.18, "Sfax": 0.14, "Sousse": 0.15, "Nabeul": 0.13,
        "Ariana": 0.17, "Bizerte": 0.12, "Gabès": 0.11, "Monastir": 0.13,
        "Kairouan": 0.10, "Beja": 0.09
    }
    region_freq = region_freq_map.get(profil.region, 0.13)

    data = {
        'Usage_Promenade et affaire': 1 if profil.usage in ["Privé", "Promenade et affaire"] else 0,
        'Energie_Essence': 1 if profil.energie == "Essence" else 0,
        'region_freq': region_freq,
        'age_conducteur': profil.age_conducteur,
        'anciennete_vehicule': profil.anciennete_vehicule if profil.anciennete_vehicule else 5,
        'exposition': 1.0,
        'age_manquant': 0,
        'sexe_masculin': 1,
        'Puissance fiscale': profil.puissance_fiscale,
        'Valeur venale': 20000,
        'Classe BM': profil.classe_bm
    }
    return pd.DataFrame([data])


def _score_risque(frequence: float, severite: float, prime_pure: float) -> dict:
    """
    Calcule le score et la classe de risque.
    Score 0-100 basé sur la prime pure normalisée.
    """
    # Seuils de classe de risque (à ajuster selon les données réelles)
    if prime_pure < 150:
        classe = "Faible"
        score = int(prime_pure / 150 * 25)
    elif prime_pure < 350:
        classe = "Moyen"
        score = 25 + int((prime_pure - 150) / 200 * 25)
    elif prime_pure < 600:
        classe = "Élevé"
        score = 50 + int((prime_pure - 350) / 250 * 25)
    else:
        classe = "Très élevé"
        score = min(75 + int((prime_pure - 600) / 400 * 25), 100)

    return {"score": score, "classe": classe}


def _predict_with_model(model, df_input: pd.DataFrame, model_name: str):
    """
    Effectue une prédiction en gérant les différents types de modèles.
    Retourne la valeur prédite ou None si erreur.
    """
    if model is None:
        return None
    try:
        # XGBoost et GLM sklearn
        if hasattr(model, "predict"):
            pred = model.predict(df_input)
            return float(pred[0])
        # CANN PyTorch
        elif hasattr(model, "forward"):
            import torch
            input_tensor = torch.FloatTensor(df_input.values)
            with torch.no_grad():
                pred = model(input_tensor)
            return float(pred.squeeze().item())
    except Exception as e:
        logger.error(f"Erreur prédiction {model_name} : {e}")
        return None


# ============================================================
# POST /api/predict/assure — Prime pure temps réel (Module 3)
# ============================================================
@router.post("/predict/assure")
async def predict_assure(profil: AssureInput, request: Request):
    """
    Calcule la prime pure pour un profil assuré donné.

    Utilise le modèle retenu automatiquement (CANN ou XGBoost selon Gini benchmark).
    Retourne : fréquence, sévérité, prime pure, score de risque, classe de risque.
    """
    try:
        models = _get_models(request)
        selections = _get_selections(request)

        # --- Modèle retenu ---
        sel = selections.get("module3", {})
        modele_retenu = sel.get("modele_retenu", "XGBoost")
        cle_freq = sel.get("cle_modele_freq", "xgb_frequence")
        cle_sev = sel.get("cle_modele_sev", "xgb_severite")

        # --- Encodage du profil ---
        df_input = _encode_assure(profil)

        # --- Prédiction fréquence ---
        model_freq = models.get(cle_freq)
        frequence_pred = _predict_with_model(model_freq, df_input, f"{modele_retenu}_frequence")

        # --- Prédiction sévérité ---
        model_sev = models.get(cle_sev)
        severite_pred = _predict_with_model(model_sev, df_input, f"{modele_retenu}_severite")

        # --- Fallback si fréquence = 0 ou None (XGBoost hors domaine) ---
        # Essayer le GLM comme backup
        if not frequence_pred:
            model_freq_glm = models.get("glm_frequence")
            try:
                freq_glm = _predict_with_model(model_freq_glm, df_input, "GLM_frequence")
                if freq_glm and freq_glm > 0:
                    frequence_pred = freq_glm
                    modele_retenu = "GLM (fallback)"
            except Exception:
                pass

        if not severite_pred or severite_pred < 100:
            model_sev_glm = models.get("glm_severite")
            try:
                sev_glm = _predict_with_model(model_sev_glm, df_input, "GLM_severite")
                if sev_glm and sev_glm > 100:
                    severite_pred = sev_glm
            except Exception:
                pass

        # --- Fallback formule actuarielle locale si modèles toujours inopérants ---
        if not frequence_pred or frequence_pred <= 0:
            bm = profil.classe_bm
            age = profil.age_conducteur
            usa = profil.usage
            eng = profil.energie
            anc = profil.anciennete_vehicule or 5
            f_bm  = 0.78 + (bm / 22) * 0.85
            f_age = 1.38 if age < 25 else (0.88 if age > 55 else 1.0)
            f_usa = 1.38 if usa == 'Commercial' else (1.18 if usa in ['Administratif','Administration'] else 1.0)
            f_eng = 1.20 if eng == 'GPL' else (0.72 if eng == 'Électrique' else 1.0)
            f_anc = 1.12 if anc > 10 else 1.0
            frequence_pred = min(0.99, 0.685 * f_bm * f_age * f_usa * f_eng * f_anc)
            modele_retenu = "Formule Actuarielle"

        if not severite_pred or severite_pred < 100:
            bm = profil.classe_bm
            pui = profil.puissance_fiscale
            usa = profil.usage
            f_pui = 0.82 + (pui / 25) * 0.55
            f_usa = 1.38 if usa == 'Commercial' else (1.18 if usa in ['Administratif','Administration'] else 1.0)
            severite_pred = 4823 * f_pui * f_usa * (1 + (bm - 10) * 0.012)

        # --- Calcul prime pure ---
        prime_pure = None
        if frequence_pred is not None and severite_pred is not None:
            prime_pure = round(frequence_pred * severite_pred, 2)

        # --- Score et classe de risque ---
        risque = {}
        if prime_pure is not None:
            risque = _score_risque(frequence_pred, severite_pred, prime_pure)

        # --- Explication SHAP individuelle (simplifiée) ---
        # --- Explication SHAP Dynamique avec l'IA ---
        shap_top3 = []
        try:
            if model_freq and hasattr(model_freq, "get_booster"):
                import shap
                import numpy as np
                # Convertir explicitement en float pour éviter les soucis de type XGBoost
                df_input_float = df_input.astype(float)
                
                # Initialisation de TreeExplainer sur le modèle XGBoost de fréquence
                explainer = shap.TreeExplainer(model_freq)
                shap_values = explainer.shap_values(df_input_float)
                
                # shap_values est un tableau 2D pour les prédictions multiples, on prend la 1ère ligne
                importances = shap_values[0]
                features = df_input_float.columns
                
                def to_float(val):
                    try:
                        if isinstance(val, (list, np.ndarray)):
                            return float(val[0])
                        if isinstance(val, str):
                            # Nettoyage si c'est une string de type array comme '[0.49]'
                            val = val.replace('[', '').replace(']', '').strip()
                        return float(val)
                    except:
                        return 0.0

                # Association des features avec leurs impacts SHAP
                impacts = [{"feature": f, "importance": to_float(v)} for f, v in zip(features, importances)]
                # Tri par valeur absolue pour avoir les plus impactants
                impacts.sort(key=lambda x: abs(x["importance"]), reverse=True)
                
                # Renommer certaines colonnes pour un affichage plus lisible côté frontend
                rename_map = {
                    "Usage_Promenade et affaire": "Usage",
                    "Energie_Essence": "Énergie",
                    "region_freq": "Région",
                    "age_conducteur": "Âge",
                    "anciennete_vehicule": "Ancienneté véhicule",
                    "Puissance fiscale": "Puissance",
                    "Classe BM": "Bonus-Malus"
                }
                
                for item in impacts[:3]:
                    name = item["feature"]
                    shap_top3.append({
                        "feature": rename_map.get(name, name.replace('_', ' ')),
                        "importance": item["importance"]
                    })
        except Exception as e:
            logger.warning(f"SHAP dynamique en erreur : {e}. Tentative via importances natives XGBoost...")
            try:
                if model_freq and hasattr(model_freq, "get_booster"):
                    scores = model_freq.get_booster().get_score(importance_type='weight')
                    features = df_input.columns
                    # Calculer la somme pour normaliser en pourcentage
                    total_score = sum(scores.values()) if scores else 1.0
                    if total_score == 0: total_score = 1.0
                    
                    impacts = []
                    for i, f in enumerate(features):
                        score = scores.get(f, scores.get(f"f{i}", 0.0))
                        # L'UI multiplie par 100. Donc pour 35%, on renvoie 0.35.
                        impacts.append({"feature": f, "importance": score / total_score})
                    
                    impacts.sort(key=lambda x: abs(x["importance"]), reverse=True)
                    
                    rename_map = {
                        "Usage_Promenade et affaire": "Usage",
                        "Energie_Essence": "Énergie",
                        "region_freq": "Région",
                        "age_conducteur": "Âge",
                        "anciennete_vehicule": "Ancienneté véhicule",
                        "Puissance fiscale": "Puissance",
                        "Classe BM": "Bonus-Malus"
                    }
                    for item in impacts[:3]:
                        name = item["feature"]
                        shap_top3.append({
                            "feature": rename_map.get(name, name.replace('_', ' ')),
                            "importance": item["importance"]
                        })
            except Exception as ex2:
                logger.error(f"Fallback XGBoost importance échoué: {ex2}")

        return {
            "status": "ok",
            "data": {
                "profil": profil.dict(),
                "modele_utilise": modele_retenu,
                "frequence": round(frequence_pred, 6) if frequence_pred is not None else None,
                "severite": round(severite_pred, 2) if severite_pred is not None else None,
                "prime_pure": prime_pure,
                "score_risque": risque.get("score"),
                "classe_risque": risque.get("classe"),
                "shap_top3": shap_top3,
                "interpretation": (
                    f"Prime pure estimée : {prime_pure:.2f} TND | "
                    f"Fréquence : {frequence_pred:.4f} | "
                    f"Sévérité : {severite_pred:.2f} TND"
                    if prime_pure is not None else
                    "Prédiction non disponible — modèle non chargé."
                ),
                "modele_disponible": model_freq is not None and model_sev is not None
            }
        }

    except Exception as e:
        logger.error(f"Erreur endpoint /api/predict/assure : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "data": None}
        )


# ============================================================
# POST /api/predict/reserving — Réserves depuis triangle partiel (Module 2)
# ============================================================
@router.post("/predict/reserving")
async def predict_reserving(triangle_input: ReservingInput, request: Request):
    """
    Estime les réserves IBNR depuis un triangle de développement partiel.
    Utilise le vrai modèle XGBoost entraîné + Chain-Ladder pour comparaison.
    """
    try:
        models = _get_models(request)

        triangle = triangle_input.triangle_data
        annees = triangle_input.annees_survenance

        # Convertir en numpy array
        triangle_np = np.array(
            [[v if v is not None else np.nan for v in row] for row in triangle],
            dtype=float
        )
        n_rows, n_cols = triangle_np.shape

        # ── 1. Chain-Ladder (méthode actuarielle classique) ──────────────────
        def chain_ladder_prediction(tri):
            tri_complete = tri.copy()
            facteurs = []
            for col in range(tri.shape[1] - 1):
                col_data = tri[:, col]
                next_col_data = tri[:, col + 1]
                mask = ~np.isnan(col_data) & ~np.isnan(next_col_data)
                facteur = next_col_data[mask].sum() / col_data[mask].sum() if mask.sum() > 0 else 1.0
                facteurs.append(facteur)
            for row in range(tri.shape[0]):
                for col in range(tri.shape[1]):
                    if np.isnan(tri_complete[row, col]) and col > 0:
                        val_prec = tri_complete[row, col - 1]
                        if not np.isnan(val_prec) and col - 1 < len(facteurs):
                            tri_complete[row, col] = val_prec * facteurs[col - 1]
            return tri_complete, facteurs

        tri_complete_cl, facteurs_cl = chain_ladder_prediction(triangle_np)

        # ── 2. XGBoost Reserving (votre modèle entraîné) ─────────────────────
        xgb_model = models.get("xgb_reserving")
        ibnr_xgb_par_annee = {}

        if xgb_model is not None:
            try:
                # Construction des features à partir du triangle
                # Exactement les 16 features attendues par le modèle
                rows_features = []
                current_year = 2018  # Année de départ estimée

                for row_i in range(n_rows):
                    annee_surv = current_year + row_i

                    # Dernier dev connu dans cette ligne
                    known_cols = [c for c in range(n_cols) if not np.isnan(triangle_np[row_i, c])]
                    if not known_cols:
                        continue
                    last_known_col = max(known_cols)

                    C_cumul = triangle_np[row_i, last_known_col]
                    C_prec  = triangle_np[row_i, last_known_col - 1] if last_known_col > 0 else C_cumul
                    facteur_obs = C_cumul / C_prec if C_prec and C_prec > 0 else 1.0
                    facteur_cl_col = facteurs_cl[last_known_col - 1] if last_known_col > 0 and last_known_col - 1 < len(facteurs_cl) else 1.0

                    rows_features.append({
                        "annee_survenance": annee_surv,
                        "dev_actuel":       last_known_col + 1,
                        "dev_restant":      n_cols - last_known_col - 1,
                        "anciennete":       last_known_col,
                        "C_cumul_actuel":   C_cumul,
                        "C_precedent":      C_prec,
                        "facteur_obs":      facteur_obs,
                        "log_C_cumul":      float(np.log(C_cumul)) if C_cumul > 0 else 0.0,
                        # Features complémentaires — valeurs moyennes du portefeuille tunisien
                        "nb_sinistres":     850,
                        "pct_corporels":    0.18,
                        "delai_decl_moyen": 45,
                        "pct_ouverts":      0.12,
                        "prime":            C_cumul * 0.7,
                        "sap_total":        C_cumul * 0.85,
                        "taux_sinistralite": 0.72,
                        "facteur_cl_col":   facteur_cl_col,
                    })

                if rows_features:
                    df_feat = pd.DataFrame(rows_features)
                    xgb_predictions = xgb_model.predict(df_feat)

                    for i, (row_i, pred) in enumerate(zip(range(n_rows), xgb_predictions)):
                        annee_surv = current_year + row_i
                        C_cumul = triangle_np[row_i, max(
                            [c for c in range(n_cols) if not np.isnan(triangle_np[row_i, c])], default=0
                        )]
                        # Le modèle prédit le coût ultime directement
                        ibnr_xgb = max(0, float(pred) - float(C_cumul))
                        ibnr_xgb_par_annee[row_i] = round(ibnr_xgb)

            except Exception as e:
                logger.error(f"XGBoost reserving error: {e}")
                ibnr_xgb_par_annee = {}

        # ── 3. Construction de la réponse par année ───────────────────────────
        ibnr_par_annee = []
        cout_ultimate_par_annee = []

        for row in range(n_rows):
            known_vals = [triangle_np[row, c] for c in range(n_cols) if not np.isnan(triangle_np[row, c])]
            derniere_valeur = known_vals[-1] if known_vals else None

            # Chain-Ladder
            cout_ultimate_cl = tri_complete_cl[row, -1] if not np.isnan(tri_complete_cl[row, -1]) else None
            ibnr_cl = (cout_ultimate_cl - derniere_valeur) if (cout_ultimate_cl and derniere_valeur) else None

            # XGBoost
            ibnr_xgb = ibnr_xgb_par_annee.get(row)

            annee_label = annees[row] if annees and row < len(annees) else f"Année {row + 1}"
            ibnr_par_annee.append({
                "annee":          annee_label,
                "dernier_connu":  round(float(derniere_valeur), 2) if derniere_valeur else None,
                "cout_ultimate":  round(float(cout_ultimate_cl), 2) if cout_ultimate_cl else None,
                "ibnr":           round(float(ibnr_cl), 2) if ibnr_cl else None,
                "ibnr_xgb":       ibnr_xgb,
            })
            if cout_ultimate_cl:
                cout_ultimate_par_annee.append(float(cout_ultimate_cl))

        ibnr_total_cl  = sum(r["ibnr"] for r in ibnr_par_annee if r["ibnr"] is not None)
        ibnr_total_xgb = sum(r["ibnr_xgb"] for r in ibnr_par_annee if r["ibnr_xgb"] is not None)
        cout_ultimate_total = sum(cout_ultimate_par_annee)

        modele_label = "XGBoost ML + Chain-Ladder" if ibnr_xgb_par_annee else "Chain-Ladder"

        return {
            "status": "ok",
            "data": {
                "modele_utilise":           modele_label,
                "xgb_disponible":           bool(ibnr_xgb_par_annee),
                "facteurs_developpement":   [round(f, 4) for f in facteurs_cl],
                "ibnr_par_annee":           ibnr_par_annee,
                "triangle_complet":         [[round(v) if not np.isnan(v) else None for v in row] for row in tri_complete_cl],
                "ibnr_total":               round(float(ibnr_total_cl), 2),
                "ibnr_total_xgb":           round(float(ibnr_total_xgb), 2) if ibnr_total_xgb else None,
                "cout_ultimate_total":      round(float(cout_ultimate_total), 2),
                "interpretation":           (
                    f"IBNR Chain-Ladder : {ibnr_total_cl:,.0f} TND | "
                    f"IBNR XGBoost (votre modèle) : {ibnr_total_xgb:,.0f} TND"
                    if ibnr_total_xgb else
                    f"IBNR Chain-Ladder : {ibnr_total_cl:,.0f} TND"
                )
            }
        }

    except Exception as e:
        logger.error(f"Erreur endpoint /api/predict/reserving : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e), "data": None}
        )

