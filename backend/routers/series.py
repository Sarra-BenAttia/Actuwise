"""
ACTUWISE — routers/series.py
Module 4 — Séries temporelles (PLACEHOLDER).

Ce module n'est pas encore implémenté.
Tous les endpoints retournent {"status": "not_implemented"} avec un message clair.
La structure des endpoints est créée pour faciliter l'intégration future.

Endpoints (placeholders) :
  GET /api/series/historique  → Données historiques + décomposition
  GET /api/series/benchmark   → Benchmark ARIMA/SARIMA/Prophet/LSTM
  GET /api/series/previsions  → Prévisions 2024 avec IC et alertes
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger("actuwise.series")
router = APIRouter()

# Message standard pour les endpoints non implémentés
NOT_IMPLEMENTED_MESSAGE = (
    "Module 4 — Séries temporelles non encore implémenté. "
    "Les notebooks 4.1, 4.2 et 4.3 sont en cours de développement. "
    "Cette section sera disponible prochainement."
)


def _placeholder_response(endpoint: str) -> dict:
    """Réponse standardisée pour les endpoints placeholder."""
    return {
        "status": "not_implemented",
        "module": "Module 4 — Séries Temporelles",
        "endpoint": endpoint,
        "message": NOT_IMPLEMENTED_MESSAGE,
        "data": None,
        "disponible_bientot": True
    }


# ============================================================
# GET /api/series/historique — PLACEHOLDER
# ============================================================
@router.get("/series/historique")
async def get_historique(request: Request):
    """
    PLACEHOLDER — Module 4 non encore implémenté.
    Retournera la décomposition de la série mensuelle 2018-2023.
    """
    return JSONResponse(
        status_code=200,
        content=_placeholder_response("/api/series/historique")
    )


# ============================================================
# GET /api/series/benchmark — PLACEHOLDER
# ============================================================
@router.get("/series/benchmark")
async def get_series_benchmark(request: Request):
    """
    PLACEHOLDER — Module 4 non encore implémenté.
    Retournera le benchmark : Baseline vs ARIMA vs SARIMA vs Prophet vs LSTM.
    """
    return JSONResponse(
        status_code=200,
        content=_placeholder_response("/api/series/benchmark")
    )


# ============================================================
# GET /api/series/previsions — PLACEHOLDER
# ============================================================
@router.get("/series/previsions")
async def get_previsions(request: Request):
    """
    PLACEHOLDER — Module 4 non encore implémenté.
    Retournera les prévisions 2024 (jan-déc) avec IC 80% et 95% et alertes ratio > 95%.
    """
    return JSONResponse(
        status_code=200,
        content=_placeholder_response("/api/series/previsions")
    )
