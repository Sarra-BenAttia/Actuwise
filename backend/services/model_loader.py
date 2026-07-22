"""
ACTUWISE — services/model_loader.py
Chargement de tous les modèles ML au démarrage de l'application.

Les modèles sont chargés une seule fois via lifespan() et stockés dans MODELS.
Jamais rechargés à chaque requête (performance critique).

Modules actifs    : 2, 3  (pkl XGBoost, GLM, CANN PyTorch)
Modules placeholder : 4   (SARIMA, Prophet, LSTM — non implémentés)
"""

import os
import pickle
import json
import logging
from pathlib import Path

# Tentative d'importation de PyTorch pour définir la classe LSTMForecaster
try:
    import torch
    import torch.nn as nn

    class LSTMForecaster(nn.Module):
        def __init__(self, input_size=1, hidden_size=64, num_layers=2, dropout=0.2):
            super(LSTMForecaster, self).__init__()
            self.hidden_size = hidden_size
            self.num_layers  = num_layers
            self.lstm = nn.LSTM(
                input_size=input_size,
                hidden_size=hidden_size,
                num_layers=num_layers,
                dropout=dropout if num_layers > 1 else 0.0,
                batch_first=True
            )
            self.fc   = nn.Linear(hidden_size, 1)
            self.dropout = nn.Dropout(p=dropout)

        def forward(self, x):
            h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
            c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
            out, _ = self.lstm(x, (h0, c0))
            out = self.dropout(out[:, -1, :])
            return self.fc(out)

    # Injection globale pour que torch.load (qui cherche dans __main__) trouve la classe
    import sys
    sys.modules['__main__'].LSTMForecaster = LSTMForecaster
except ImportError:
    pass

logger = logging.getLogger("actuwise.model_loader")

# Répertoire contenant les modèles (configurable via .env)
MODELS_DIR = os.getenv("MODELS_DIR", "./models")

def _load_json(filename: str, description: str):
    """
    Charge un modèle sérialisé en json (.json).
    Retourne None si le fichier est absent (sans crash).
    """
    filepath = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(filepath):
        logger.warning(f"[MODEL] Fichier manquant : {filepath} ({description})")
        return None
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        logger.info(f"[MODEL] ✓ {filename} chargé ({description})")
        return data
    except Exception as e:
        logger.error(f"[MODEL] Erreur chargement {filename} : {e}")
        return None


def _load_pickle(filename: str, description: str):
    """
    Charge un modèle sérialisé en pickle (.pkl).
    Retourne None si le fichier est absent (sans crash).
    """
    filepath = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(filepath):
        logger.warning(f"[MODEL] Fichier manquant : {filepath} ({description})")
        return None
    try:
        with open(filepath, "rb") as f:
            model = pickle.load(f)
        logger.info(f"[MODEL] ✓ {filename} chargé ({description})")
        return model
    except Exception as e:
        logger.error(f"[MODEL] Erreur chargement {filename} : {e}")
        return None


def _load_yolo(filename: str, description: str):
    """
    Charge un modèle YOLO (ultralytics).
    Retourne None si le fichier est absent ou ultralytics non installé.
    """
    filepath = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(filepath):
        logger.warning(f"[MODEL] Fichier manquant : {filepath} ({description})")
        return None
    try:
        from ultralytics import YOLO
        import torch
        # Forcer sur CPU ou GPU selon dispo
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = YOLO(filepath)
        model.to(device)
        logger.info(f"[MODEL] ✓ {filename} chargé ({description}) sur {device}")
        return model
    except ImportError:
        logger.error("[MODEL] ultralytics non installé — YOLO non disponible")
        return None
    except Exception as e:
        logger.error(f"[MODEL] Erreur chargement YOLO {filename} : {e}")
        return None


def _load_pytorch(filename: str, description: str, model_class=None, model_kwargs: dict = None):
    """
    Charge un modèle PyTorch (.pt).
    Retourne None si le fichier est absent ou si torch n'est pas disponible.

    Note : Pour les modèles PyTorch, on charge le state_dict.
    Si model_class est fourni, on instancie le modèle et on charge les poids.
    Sinon on retourne le state_dict brut.
    """
    filepath = os.path.join(MODELS_DIR, filename)
    if not os.path.exists(filepath):
        logger.warning(f"[MODEL] Fichier manquant : {filepath} ({description})")
        return None
    try:
        import torch
        # Chargement sur CPU par défaut (serveur sans GPU)
        checkpoint = torch.load(filepath, map_location=torch.device("cpu"))

        if model_class is not None:
            # Instanciation du modèle avec les hyperparamètres
            kwargs = model_kwargs or {}
            model = model_class(**kwargs)
            # Gestion des différents formats de sauvegarde PyTorch
            if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                model.load_state_dict(checkpoint["state_dict"])
            elif isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                model.load_state_dict(checkpoint["model_state_dict"])
            else:
                model.load_state_dict(checkpoint)
            model.eval()  # Mode inférence
            logger.info(f"[MODEL] ✓ {filename} (PyTorch) chargé ({description})")
            return model
        else:
            # Retourne le checkpoint brut (state_dict ou modèle complet)
            logger.info(f"[MODEL] ✓ {filename} (PyTorch checkpoint) chargé ({description})")
            return checkpoint

    except ImportError:
        logger.error("[MODEL] PyTorch non installé — modèles .pt non disponibles")
        return None
    except Exception as e:
        logger.error(f"[MODEL] Erreur chargement PyTorch {filename} : {e}")
        return None


def load_all_models() -> dict:
    """
    Charge tous les modèles ML au démarrage.
    Retourne un dictionnaire {nom_logique: modèle}.

    Modules 2-3 : chargement réel (pkl + pt)
    Module 4    : placeholder (None)
    """
    models = {}

    # ============================================================
    # MODULE 2 — Provisionnement ML
    # ============================================================
    models["xgb_reserving"] = _load_pickle(
        "xgb_reserving.pkl",
        "XGBoost ML Reserving (Module 2)"
    )

    # ============================================================
    # MODULE 3 — Modélisation des risques
    # ============================================================

    # --- GLM (Generalized Linear Model) ---
    models["glm_frequence"] = _load_pickle(
        "glm_freq.pkl",
        "GLM Fréquence sinistres (Module 3.2)"
    )
    models["glm_severite"] = _load_pickle(
        "glm_sev.pkl",
        "GLM Sévérité sinistres (Module 3.2)"
    )

    # --- XGBoost ---
    models["xgb_frequence"] = _load_pickle(
        "xgb_freq.pkl",
        "XGBoost Fréquence sinistres (Module 3.3)"
    )
    models["xgb_severite"] = _load_pickle(
        "xgb_sev.pkl",
        "XGBoost Sévérité sinistres (Module 3.3)"
    )

    # --- CANN (Combined Actuarial Neural Network) PyTorch ---
    # Chargé sans instanciation de classe car l'architecture dépend des notebooks
    # Le router de prédiction gère l'inférence selon le format de sauvegarde
    models["cann_model"] = _load_pytorch(
        "cann_model.pt",
        "CANN PyTorch (Combined Actuarial Neural Network — Module 3.5)"
    )

    # ============================================================
    # MODULE 4 — Séries temporelles
    # ============================================================
    models["sarima_model"] = _load_json("arima_params.json", "Paramètres ARIMA (Module 4)")
    models["prophet_model"] = None      # Non fourni, laissé à None
    models["lstm_model"] = _load_pytorch("lstm_best.pt", "LSTM PyTorch (Module 4)")

    # ============================================================
    # MODULE FRAUDE
    # ============================================================
    models["fraude_scaler"] = _load_pickle("scaler.pkl", "Scaler pour DBSCAN (Fraude)")
    models["fraude_dbscan"] = _load_pickle("dbscan_model.pkl", "Modèle DBSCAN (Fraude)")
    models["fraude_kmeans"] = _load_pickle("kmeans_model.pkl", "Modèle KMeans (Fraude)")
    models["fraude_features"] = _load_pickle("feature_columns.pkl", "Colonnes features (Fraude)")

    # ============================================================
    # MODULE PHOTOCAR
    # ============================================================
    models["photocar_yolo"] = _load_yolo("photocar_yolo_best.pt", "Modèle YOLO (PhotoCar)")
    models["photocar_cost_xgb"] = _load_pickle("model_cost_xgboost.pkl", "Modèle XGBoost Coût (PhotoCar)")
    models["photocar_features"] = _load_pickle("feature_cols.pkl", "Colonnes features (PhotoCar)")

    # ============================================================
    # MODULE SINISTRIA
    # ============================================================
    def _load_sinistria_cnn():
        try:
            from services.sinistria.classification_accident import charger_modele
            path = os.path.join(MODELS_DIR, "cnn_accident.pth")
            model, transform = charger_modele(path)
            logger.info(f"[MODEL] \u2713 CNN SinistrIA chargé")
            return {"model": model, "transform": transform}
        except Exception as e:
            logger.warning(f"[MODEL] Fichier manquant ou erreur SinistrIA CNN : cnn_accident.pth ({e})")
            return None

    def _load_sinistria_easyocr():
        try:
            from services.sinistria.ocr_tunisien import get_reader
            reader = get_reader()
            logger.info(f"[MODEL] \u2713 EasyOCR Reader chargé")
            return reader
        except Exception as e:
            logger.warning(f"[MODEL] Erreur chargement EasyOCR : {e}")
            return None

    models["sinistria_cnn"] = _load_sinistria_cnn()
    models["sinistria_ocr"] = _load_sinistria_easyocr()

    # ============================================================
    # Résumé du chargement
    # ============================================================
    nb_charges = sum(1 for v in models.values() if v is not None)
    nb_total = len(models)
    logger.info(f"[MODEL] Chargement terminé. {nb_charges}/{nb_total} modèles disponibles.")

    if nb_charges < nb_total:
        manquants = [k for k, v in models.items() if v is None]
        logger.info(f"[MODEL] Modèles non disponibles (placeholder) : {manquants}")

    return models
