@echo off
REM Feedback Analyzer V2 - Windows Setup

echo ========================================
echo Feedback Analyzer V2 - Setup
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not installed!
    echo Install from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js installed
node --version
echo.

REM Install dependencies
echo ========================================
echo Installing dependencies...
echo ========================================
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Setup database
echo ========================================
echo Setting up D1 database...
echo ========================================
call npm run setup-db
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to setup database
    pause
    exit /b 1
)
echo [OK] Database created
echo.

REM Seed data
echo ========================================
echo Seeding database with tweets...
echo ========================================
call npm run seed-data
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to seed database
    pause
    exit /b 1
)
echo [OK] Database seeded with 35 tweets
echo.

REM Success
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Run 'npm run dev' for local testing
echo 2. Run 'npm run dev:remote' for Workers AI
echo 3. Open http://localhost:8787
echo.
echo For deployment: See README.md
echo.
pause
