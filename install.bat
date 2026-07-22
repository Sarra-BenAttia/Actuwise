@echo off
:: ============================================================
:: ACTUWISE — Script d'installation complète (Windows)
:: À lancer UNE SEULE FOIS après le clonage du projet
:: ============================================================

echo ====================================================
echo    ACTUWISE — Installation complète
echo ====================================================
echo.

:: ---- BACKEND ----
echo [BACKEND] Création de l'environnement virtuel Python...
cd backend
python -m venv venv
if %errorlevel% neq 0 (
    echo [ERREUR] Impossible de créer le venv. Vérifiez Python 3.11.
    pause
    exit /b 1
)

echo [BACKEND] Activation du venv et installation des dépendances...
call venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERREUR] Erreur lors de l'installation des dépendances Python.
    pause
    exit /b 1
)

:: Copier .env si nécessaire
if not exist ".env" (
    copy .env.example .env
    echo [INFO] Fichier .env créé depuis .env.example
    echo [ACTION REQUISE] Renseignez OPENAI_API_KEY dans backend\.env
)

echo [BACKEND] Installation terminée.
echo.

:: ---- FRONTEND ----
cd ..\frontend
echo [FRONTEND] Installation des dépendances Node.js...
npm install
if %errorlevel% neq 0 (
    echo [ERREUR] Erreur lors de npm install.
    pause
    exit /b 1
)
echo [FRONTEND] Installation terminée.
echo.

cd ..

echo ====================================================
echo  Installation réussie !
echo.
echo  Prochaine étape :
echo  1. Éditez backend\.env et renseignez OPENAI_API_KEY
echo  2. Placez vos CSV dans backend\data\
echo  3. Placez vos modèles dans backend\models\
echo  4. Placez vos figures dans backend\figures\
echo  5. Lancez start.bat pour démarrer l'application
echo ====================================================
pause
