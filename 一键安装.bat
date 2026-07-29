@echo off
title Lumind Setup
cd /d "%~dp0"

echo ============================================
echo   Lumind - AI Creator OS
echo   One-Click Setup
echo ============================================
echo.

echo [1/2] Installing dependencies...
call pnpm install
if %errorlevel% neq 0 (
    echo ERROR: pnpm install failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Creating desktop shortcut...
cscript //Nologo "%~dp0setup.vbs"

echo.
echo ============================================
echo   Setup complete!
echo   Double-click desktop shortcut to start.
echo ============================================
pause