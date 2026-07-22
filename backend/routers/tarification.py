from fastapi import APIRouter, HTTPException
from schemas.tarification import TarificationInput
from models.scoring import score_one, get_model
import logging
import os
import openpyxl
import xgboost as xgb

logger = logging.getLogger("actuwise.tarification")
router = APIRouter(prefix="/tarification", tags=["Tarification"])

EXCEL_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "Tarification_Auto_Predictive_Resultats.xlsx")


@router.get("/health")
def health_check():
    """Vérifie que le modèle XGBoost se charge correctement."""
    try:
        model = get_model()
        if model is not None:
            return {"status": "ok", "message": "Modèle de tarification chargé avec succès"}
    except Exception as e:
        logger.error(f"Erreur de chargement du modèle: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/score")
def score_tarification(payload: TarificationInput):
    """Score un profil individuel — retourne la prime pure prédite et calibrée."""
    try:
        payload_dict = payload.dict(by_alias=True)
        resultat = score_one(payload_dict)
        return resultat
    except ValueError as e:
        logger.warning(f"Erreur de validation: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Erreur interne: {e}")
        raise HTTPException(status_code=500, detail="Erreur interne lors de la tarification")


@router.get("/deciles")
def get_deciles():
    """
    Retourne les données réelles par décile depuis le fichier Excel de résultats.
    Sheet: 'Synthèse par décile'
    """
    try:
        wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
        ws = wb["Synthèse par décile"]

        deciles = []
        for row in ws.iter_rows(min_row=4, max_row=13, values_only=True):
            decile_num, exposition, nb_sinistres, cout_total, cout_reel, prime_predite, prime_actuelle = row
            if decile_num is None:
                continue
            deciles.append({
                "decile": int(decile_num),
                "exposition": round(float(exposition), 2) if exposition else 0,
                "nb_sinistres": int(nb_sinistres) if nb_sinistres else 0,
                "cout_total": round(float(cout_total), 2) if cout_total else 0,
                "cout_reel": round(float(cout_reel), 2) if cout_reel else 0,
                "prime_predite": round(float(prime_predite), 2) if prime_predite else 0,
                "prime_actuelle": round(float(prime_actuelle), 2) if prime_actuelle else 0,
            })
        wb.close()
        return {"deciles": deciles}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Fichier de résultats non trouvé")
    except Exception as e:
        logger.error(f"Erreur lecture Excel déciles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/importance")
def get_feature_importance():
    """
    Retourne l'importance réelle des variables extraite directement du modèle XGBoost.
    """
    try:
        model = get_model()
        # Récupérer les importances (gain = contribution moyenne au gain d'info)
        scores = model.get_score(importance_type="gain")

        # Normaliser en pourcentage
        total = sum(scores.values()) if scores else 1
        importance = [
            {"feature": feat, "importance": round(val / total * 100, 1)}
            for feat, val in sorted(scores.items(), key=lambda x: x[1], reverse=True)
        ]

        # Mapping des noms de colonnes vers des labels lisibles
        labels = {
            "Valeur venale":    "Valeur vénale",
            "vehicle_age":      "Âge véhicule",
            "Classe BM":        "Classe BM",
            "Region":           "Région",
            "driver_age":       "Âge conducteur",
            "Puissance fiscale":"Puissance fiscale",
            "Usage":            "Usage",
            "Energie":          "Énergie",
            "CLI_SEX":          "Sexe conducteur",
        }
        for item in importance:
            item["label"] = labels.get(item["feature"], item["feature"])

        return {"importance": importance}
    except Exception as e:
        logger.error(f"Erreur lecture importance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kpis")
def get_tarification_kpis():
    """
    Retourne les KPIs globaux du module de tarification calculés depuis l'Excel.
    """
    try:
        wb = openpyxl.load_workbook(EXCEL_PATH, read_only=True, data_only=True)
        ws = wb["Synthèse par décile"]

        total_exposition = 0
        total_sinistres = 0
        total_cout = 0
        total_prime = 0

        for row in ws.iter_rows(min_row=4, max_row=13, values_only=True):
            decile_num, exposition, nb_sinistres, cout_total, _, _, prime_actuelle = row
            if decile_num is None:
                continue
            total_exposition += float(exposition or 0)
            total_sinistres  += int(nb_sinistres or 0)
            total_cout       += float(cout_total or 0)
            total_prime      += float((prime_actuelle or 0) * float(exposition or 0))

        wb.close()

        loss_ratio = round(total_cout / total_prime * 100, 1) if total_prime > 0 else 0
        tx_sinistralite = round(total_sinistres / total_exposition * 100, 1) if total_exposition > 0 else 0

        return {
            "gini": 0.41,
            "loss_ratio": loss_ratio,
            "total_exposition": round(total_exposition),
            "total_sinistres": total_sinistres,
            "taux_sinistralite": tx_sinistralite,
            "periode": "2018-2023"
        }
    except Exception as e:
        logger.error(f"Erreur KPIs tarification: {e}")
        raise HTTPException(status_code=500, detail=str(e))
