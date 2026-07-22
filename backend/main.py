"""
ACTUWISE — Backend FastAPI
Point d'entrée principal de l'application.

Chargement unique des modèles et données au démarrage via le mécanisme lifespan.
Tous les modèles sont stockés dans le dictionnaire global MODELS.
Toutes les données CSV sont stockées dans le dictionnaire global DATA.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import logging

from dotenv import load_dotenv

# Chargement des variables d'environnement depuis .env
load_dotenv()

# Configuration du logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("actuwise")

# Importation des services de chargement
from services.model_loader import load_all_models
from services.data_loader import load_all_data
from services.model_selector import select_all_models

# Importation des routers
from routers import stats, sinistralite, provisionnement, modelisation, forecast, ratio_combine, prediction, assistant, auth, tarification, fraude, photocar, sinistria

# Importation DB
from database import engine, Base, SessionLocal
from models_db import User
from routers.auth import get_password_hash

# ============================================================
# Dictionnaires globaux — accessibles depuis tous les routers
# ============================================================
MODELS = {}            # Modèles ML chargés : pkl + pt
DATA = {}              # DataFrames pandas chargés depuis les CSV
MODEL_SELECTIONS = {}  # Sélections automatiques du meilleur modèle par module


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestionnaire de cycle de vie FastAPI.
    Chargement unique des modèles et données au démarrage.
    Libération des ressources à l'arrêt.
    """
    logger.info("=" * 60)
    logger.info("  ACTUWISE — Démarrage de l'application")
    logger.info("=" * 60)

    # --- Initialisation Base de Données ---
    logger.info("[DB] Initialisation de la base de données PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    if not db.query(User).filter(User.email == "actuaire@actuwise.com").first():
        logger.info("[DB] Création de l'utilisateur actuaire par défaut...")
        default_user = User(
            email="actuaire@actuwise.com",
            password_hash=get_password_hash("admin123"),
            role="actuaire"
        )
        db.add(default_user)
        db.commit()
    db.close()

    # --- Chargement des données CSV en mémoire ---
    logger.info("[1/2] Chargement des données CSV...")
    loaded_data = load_all_data()
    DATA.update(loaded_data)
    logger.info(f"  → {len(DATA)} jeux de données chargés : {list(DATA.keys())}")

    # --- Chargement des modèles ML ---
    logger.info("[2/2] Chargement des modèles ML...")
    loaded_models = load_all_models()
    MODELS.update(loaded_models)
    logger.info(f"  → {len(MODELS)} modèles chargés : {list(MODELS.keys())}")

    # --- Sélection automatique du meilleur modèle par module ---
    logger.info("[3/3] Sélection automatique des meilleurs modèles selon benchmarks...")
    MODEL_SELECTIONS.update(select_all_models(DATA))
    logger.info(f"  → Module 2 : {MODEL_SELECTIONS.get('module2', {}).get('modele_retenu', 'N/A')}")
    logger.info(f"  → Module 3 : {MODEL_SELECTIONS.get('module3', {}).get('modele_retenu', 'N/A')}")
    logger.info(f"  → Module 4 : placeholder (non implémenté)")

    logger.info("=" * 60)
    logger.info("  ACTUWISE — Application prête !")
    logger.info("  Backend disponible sur http://localhost:8000")
    logger.info("  Documentation : http://localhost:8000/docs")
    logger.info("=" * 60)

    yield  # L'application est opérationnelle

    # --- Nettoyage à l'arrêt ---
    logger.info("ACTUWISE — Arrêt de l'application. Libération des ressources.")
    MODELS.clear()
    DATA.clear()


# ============================================================
# Création de l'application FastAPI
# ============================================================
app = FastAPI(
    title="ACTUWISE API",
    description="Plateforme actuarielle intelligente pour l'assurance automobile tunisienne",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# --- Configuration CORS ---
# Autorise le frontend React (port 3000) à appeler le backend
cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
cors_origins = [origin.strip() for origin in cors_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# --- Servir les figures statiques (PNG des notebooks) ---
figures_dir = os.getenv("FIGURES_DIR", "./figures")
if os.path.exists(figures_dir):
    app.mount("/figures", StaticFiles(directory=figures_dir), name="figures")
    logger.info(f"Figures statiques servies depuis : {figures_dir}")

# ============================================================
# Enregistrement des routers
# ============================================================

# Injecter les dictionnaires globaux dans les routers via l'état de l'app
app.state.models = MODELS
app.state.data = DATA
app.state.model_selections = MODEL_SELECTIONS  # Sélections automatiques

# Router SinistrIA (OCR + Croquis CNN)
app.include_router(sinistria.router)

# Router stats (KPIs, résultats clés)
app.include_router(stats.router, prefix="/api", tags=["Stats & KPIs"])

# Router sinistralité (Module 1)
app.include_router(sinistralite.router, prefix="/api", tags=["Module 1 — Sinistralité"])

# Router provisionnement (Module 2)
app.include_router(provisionnement.router, prefix="/api", tags=["Module 2 — Provisionnement"])

# Router modélisation des risques (Module 3)
app.include_router(modelisation.router, prefix="/api", tags=["Module 3 — Modélisation Risques"])

# Router séries temporelles (Module 4)
app.include_router(forecast.router, prefix="/api", tags=["Module 4 — Séries Temporelles"])

# Router ratio combiné
app.include_router(ratio_combine.router, prefix="/api", tags=["Ratio Combiné"])

# Router prédiction temps réel
app.include_router(prediction.router, prefix="/api", tags=["Prédictions Temps Réel"])

# Router assistant IA (Module 6)
app.include_router(assistant.router, prefix="/api", tags=["Module 6 — Assistant IA"])

# Router Auth
app.include_router(auth.router, prefix="/api", tags=["Auth"])

# Router Tarification (Bonus Malus)
app.include_router(tarification.router, prefix="/api", tags=["Tarification"])

# Router Détection de fraude
app.include_router(fraude.router, prefix="/api/fraude", tags=["Module Fraude"])
app.include_router(photocar.router, prefix="/api/photocar", tags=["PhotoCar"])


# ============================================================
# Endpoint racine — vérification de santé
# ============================================================
@app.get("/", tags=["Health"])
async def root():
    """Vérification de santé de l'API ACTUWISE."""
    return {
        "application": "ACTUWISE",
        "version": "1.0.0",
        "status": "operational",
        "description": "Plateforme actuarielle intelligente pour l'assurance automobile tunisienne",
        "modules_actifs": ["Module 0", "Module 1", "Module 2", "Module 3"],
        "modules_placeholder": ["Module 4", "Module 6"],
        "documentation": "/docs"
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Endpoint de santé détaillé avec état des modèles et données."""
    return {
        "status": "ok",
        "modeles_charges": list(MODELS.keys()),
        "donnees_chargees": list(DATA.keys()),
        "nb_modeles": len(MODELS),
        "nb_datasets": len(DATA)
    }


# ============================================================
# Frontend statique — servi directement par FastAPI
# ============================================================
_FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public")
_FRONTEND_DIR = os.path.abspath(_FRONTEND_DIR)

if os.path.exists(_FRONTEND_DIR):
    @app.get("/app", include_in_schema=False)
    async def serve_app():
        return FileResponse(os.path.join(_FRONTEND_DIR, "app.html"))

    @app.get("/login", include_in_schema=False)
    async def serve_login():
        return FileResponse(os.path.join(_FRONTEND_DIR, "login.html"))

    @app.get("/dashboard", include_in_schema=False)
    async def serve_dashboard():
        path = os.path.join(_FRONTEND_DIR, "dashboard.html")
        if os.path.exists(path):
            return FileResponse(path)
        return FileResponse(os.path.join(_FRONTEND_DIR, "app.html"))

    # Fichiers statiques (CSS, JS, images, assets)
    app.mount("/", StaticFiles(directory=_FRONTEND_DIR, html=True), name="frontend")
    logger.info(f"Frontend statique servi depuis : {_FRONTEND_DIR}")
