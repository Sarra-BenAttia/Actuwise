@echo off
title ACTUWISE - Demarrage
echo ============================================
echo   ACTUWISE - Plateforme Actuarielle
echo ============================================
echo.

:: Tuer tous les processus sur le port 8000 si existants
echo [1/2] Nettoyage du port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 "') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 /nobreak >nul

:: Demarrer le backend
echo [2/2] Demarrage du backend FastAPI...
cd /d C:\Users\LENOVO\Desktop\ddd\actuwise_app\backend
start "ACTUWISE Backend" venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000

:: Attendre que le serveur demarre
echo.
echo Chargement des modeles IA (30 secondes environ)...
timeout /t 12 /nobreak >nul

:: Ouvrir le navigateur
echo Ouverture de l'application dans le navigateur...
start "" "http://localhost:8000/login.html"

echo.
echo ============================================
echo   Application disponible sur :
echo   http://localhost:8000/login.html
echo.
echo   Email    : actuaire@actuwise.com
echo   Password : admin123
echo ============================================
pause
