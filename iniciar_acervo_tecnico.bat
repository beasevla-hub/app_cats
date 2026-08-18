@echo off
setlocal

set "APP_ROOT=%~dp0"
set "BACKEND_PORT=8717"
set "FRONTEND_PORT=3717"
set "API_URL=http://127.0.0.1:%BACKEND_PORT%/api/v1"
set "FRONTEND_URL=http://127.0.0.1:%FRONTEND_PORT%"

echo.
echo ================================================
echo   SISTEMA DE ACERVOS TECNICOS
echo ================================================
echo.
echo Backend:  %API_URL%
echo Frontend: %FRONTEND_URL%
echo.
echo As duas janelas precisam permanecer abertas.
echo Para encerrar o sistema, feche as janelas do backend e frontend.
echo.

start "Acervo Tecnico - Backend" cmd /k "cd /d ""%APP_ROOT%backend"" && echo Backend em %API_URL% && uvicorn main:app --reload --host 127.0.0.1 --port %BACKEND_PORT%"

start "Acervo Tecnico - Frontend" cmd /k "cd /d ""%APP_ROOT%frontend"" && set NEXT_PUBLIC_API_URL=%API_URL% && echo Frontend em %FRONTEND_URL% && pnpm exec next dev --hostname 127.0.0.1 --port %FRONTEND_PORT%"

timeout /t 5 /nobreak >nul
start "" "%FRONTEND_URL%"

endlocal
