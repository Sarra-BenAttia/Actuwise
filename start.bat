@echo off
:: ============================================================
:: ACTUWISE — Script de lancement Windows
:: Lance le backend FastAPI et le frontend React simultanément
:: ============================================================

echo ====================================================
echo    ACTUWISE — Plateforme Actuarielle Intelligente
echo ====================================================
echo.

:: Vérifier que Python est disponible
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas installé ou non trouvé dans le PATH.
    pause
    exit /b 1
)

:: Vérifier que Node.js est disponible
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installé ou non trouvé dans le PATH.
    pause
    exit /b 1
)

:: Vérifier que le fichier .env existe dans le backend
if not exist "backend\.env" (
    echo [AVERTISSEMENT] Fichier backend\.env non trouvé.
    echo Copie de .env.example vers .env...
    copy backend\.env.example backend\.env
    echo [ACTION REQUISE] Éditez backend\.env et renseignez OPENAI_API_KEY
    echo.
)

:: Lancer le backend FastAPI dans un nouveau terminal
echo [1/2] Lancement du backend FastAPI (port 8000)...
start cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload --port 8000"

:: Attendre 3 secondes pour laisser le backend démarrer
timeout /t 3 /nobreak >nul

:: Lancer le frontend React dans un nouveau terminal
echo [2/2] Lancement du frontend React (port 3000)...
start cmd /k "cd frontend && npm run dev"

echo.
echo ====================================================
echo  Backend  : http://localhost:8000
echo  Frontend : http://localhost:3000
echo  API Docs : http://localhost:8000/docs
echo ====================================================
echo.
echo Les deux serveurs sont en cours de démarrage...
echo Ouvrez http://localhost:3000 dans votre navigateur.
pause
