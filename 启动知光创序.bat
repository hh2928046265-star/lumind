@echo off
title Lumind / ZhiGuang ChuangXu
cd /d "%~dp0"

echo ============================================
echo   Lumind - AI Creator OS
echo ============================================
echo.
echo Starting backend server...

start "Lumind-Backend" /MIN cmd /k "cd /d packages\server && echo [Backend] Starting... && npx tsx src/index.ts"
timeout /t 4 /nobreak >nul

echo Starting frontend server...
start "Lumind-Frontend" /MIN cmd /k "cd /d packages\client && echo [Frontend] Starting... && npx vite --port 5173"
timeout /t 5 /nobreak >nul

echo Opening browser...
start http://localhost:5173

echo.
echo ============================================
echo   Lumind is running!
echo   http://localhost:5173
echo   Close this window to stop all servers.
echo ============================================
pause >nul

taskkill /FI "WINDOWTITLE eq Lumind-Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Lumind-Frontend*" /T /F >nul 2>&1