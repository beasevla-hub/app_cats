@echo off
title APP CATS Launcher

REM ===== CONFIGURACAO =====
set BACKEND_PORT=18741
set FRONTEND_PORT=31841

REM Ajuste este caminho caso necessario
set PROJECT_DIR=%~dp0

echo ======================================
echo      INICIANDO APP CATS
echo ======================================
echo.
echo Backend : http://localhost:%BACKEND_PORT%
echo Frontend: http://localhost:%FRONTEND_PORT%
echo.

REM ================= BACKEND =================

start "APP CATS - Backend" cmd /k ^
"cd /d "%PROJECT_DIR%backend" && ^
set DATABASE_URL=postgresql://postgres:senha123@localhost:5432/acervos_db && ^
uvicorn main:app --host 127.0.0.1 --port %BACKEND_PORT% --reload"

REM ================= FRONTEND =================

start "APP CATS - Frontend" cmd /k ^
"cd /d "%PROJECT_DIR%frontend" && ^
set PORT=%FRONTEND_PORT% && ^
npm run dev"

timeout /t 3 >nul

start http://localhost:%FRONTEND_PORT%

echo.
echo App iniciado.
echo Feche as duas janelas para encerrar.
pause