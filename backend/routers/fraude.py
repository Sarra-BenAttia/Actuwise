"""
ACTUWISE — routers/fraude.py
Nouveau Module — Détection de fraude.

Endpoints :
  GET /api/fraude/choix-formulaire → Expose form_choices.json
  POST /api/fraude/score → Score un nouveau dossier via fraude_utils.py
"""

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
import logging
import json
import os

from services.fraude_utils import score_dossier

logger = logging.getLogger("actuwise.fraude")
router = APIRouter()

# Chemin vers form_choices.json
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FORM_CHOICES_PATH = os.path.join(BACKEND_DIR, "data", "form_choices.json")


@router.get("/choix-formulaire")
async def get_choix_formulaire():
    """
    Retourne les options du formulaire pour la saisie d'un dossier.
    """
    if not os.path.exists(FORM_CHOICES_PATH):
        logger.error(f"Fichier {FORM_CHOICES_PATH} introuvable.")
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": "Fichier de configuration introuvable"}
        )
        
    try:
        with open(FORM_CHOICES_PATH, "r", encoding="utf-8") as f:
            choices = json.load(f)
        return {"status": "ok", "data": choices}
    except Exception as e:
        logger.error(f"Erreur de lecture de {FORM_CHOICES_PATH} : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )


@router.post("/score")
async def post_score(request: Request):
    """
    Reçoit un dictionnaire correspondant aux champs du formulaire,
    et renvoie le score de suspicion et les règles déclenchées.
    """
    try:
        # Récupération du JSON envoyé par le client
        form_data = await request.json()
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "JSON invalide"}
        )

    # Récupération des modèles depuis l'état de l'application
    models = request.app.state.models

    try:
        # Appel du service métier de scoring
        result = score_dossier(form_data, models)
        
        # S'il y a des erreurs de saisie détectées par score_dossier
        if result.get("erreurs"):
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Erreurs de validation", "erreurs": result["erreurs"]}
            )
            
        return {"status": "ok", "data": result}
        
    except Exception as e:
        logger.error(f"Erreur lors du scoring de fraude : {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )
