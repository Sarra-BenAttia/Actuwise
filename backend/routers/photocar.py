from fastapi import APIRouter, File, UploadFile, Request
from fastapi.responses import JSONResponse
import logging

from services.photocar_utils import process_image

router = APIRouter()
logger = logging.getLogger("actuwise.photocar")

@router.post("/analyze")
async def analyze_car_photo(request: Request, file: UploadFile = File(...)):
    """
    Reçoit une photo de véhicule, exécute YOLO pour détecter les dommages,
    puis XGBoost pour estimer le coût.
    """
    try:
        image_bytes = await file.read()
        
        # Récupération des modèles globaux
        models = request.app.state.models
        
        result = process_image(image_bytes, models)
        return JSONResponse(content={"status": "success", "data": result})
        
    except Exception as e:
        logger.error(f"[PHOTOCAR] Erreur lors de l'analyse : {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
