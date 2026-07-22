#!/bin/bash
# ============================================================
# ACTUWISE — Script de lancement Unix/macOS/Linux
# Lance le backend FastAPI et le frontend React simultanément
# ============================================================

echo "===================================================="
echo "   ACTUWISE — Plateforme Actuarielle Intelligente"
echo "===================================================="
echo ""

# Vérifier si Python 3 est disponible
if ! command -v python3 &> /dev/null; then
    echo "[ERREUR] Python 3 n'est pas installé ou non disponible dans le PATH."
    exit 1
fi

# Vérifier si Node.js/npm est disponible
if ! command -v npm &> /dev/null; then
    echo "[ERREUR] Node.js/npm n'est pas installé ou non disponible dans le PATH."
    exit 1
fi

# Vérifier le fichier .env
if [ ! -f "backend/.env" ]; then
    echo "[AVERTISSEMENT] Fichier backend/.env non trouvé."
    echo "Copie de .env.example vers .env..."
    cp backend/.env.example backend/.env
    echo "[ACTION REQUISE] Renseignez votre clé OPENAI_API_KEY dans backend/.env"
    echo ""
fi

# Fonction de nettoyage lors de l'arrêt
cleanup() {
    echo ""
    echo "Arrêt des serveurs backend et frontend..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Démarrer le backend FastAPI
echo "[1/2] Démarrage du backend FastAPI sur le port 8000..."
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
fi
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Attendre 2 secondes
sleep 2

# Démarrer le frontend React
echo "[2/2] Démarrage du frontend React sur le port 3000..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "===================================================="
echo "  Backend  : http://localhost:8000"
echo "  Frontend : http://localhost:3000"
echo "  API Docs : http://localhost:8000/docs"
echo "===================================================="
echo "Les serveurs tournent en arrière-plan. Appuyez sur Ctrl+C pour quitter."

# Garder le script actif
wait
