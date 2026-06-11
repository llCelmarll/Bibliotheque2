#!/usr/bin/env pwsh
param()

$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$WorkDir,
        [string]$Command
    )
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "
        `$host.UI.RawUI.WindowTitle = '$Title'
        Set-Location '$WorkDir'
        $Command
    "
}

Write-Host ""
Write-Host "Demarrage de l'environnement de developpement..." -ForegroundColor Cyan
Write-Host ""

# --- PostgreSQL via Docker ---
Write-Host "[1/4] PostgreSQL (Docker)..." -ForegroundColor Yellow
Set-Location $Root
docker compose up -d postgres
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur : impossible de demarrer PostgreSQL." -ForegroundColor Red
    exit 1
}
Write-Host "      PostgreSQL demarre." -ForegroundColor Green

# --- Backend FastAPI (venv natif) ---
Write-Host "[2/4] Backend FastAPI..." -ForegroundColor Yellow
$BackendDir = Join-Path $Root "backend"
$VenvActivate = Join-Path $Root ".venv\Scripts\Activate.ps1"

$BackendCmd = "
    & '$VenvActivate'
    Get-Content .env | ForEach-Object {
        if (`$_ -match '^\s*([^#][^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable(`$matches[1].Trim(), `$matches[2].Trim(), 'Process')
        }
    }
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"
Start-ServiceWindow -Title "Backend :8000" -WorkDir $BackendDir -Command $BackendCmd
Write-Host "      Fenetre Backend ouverte." -ForegroundColor Green

# --- Frontend Expo Web ---
Write-Host "[3/4] Frontend Expo Web..." -ForegroundColor Yellow
$FrontendDir = Join-Path $Root "frontend"
Start-ServiceWindow -Title "Frontend :8081" -WorkDir $FrontendDir -Command "npm run web"
Write-Host "      Fenetre Frontend ouverte." -ForegroundColor Green

# --- Frontend Admin Vite ---
Write-Host "[4/4] Frontend Admin Vite..." -ForegroundColor Yellow
$AdminDir = Join-Path $Root "frontend-admin"
Start-ServiceWindow -Title "Admin :3001" -WorkDir $AdminDir -Command "npm run dev"
Write-Host "      Fenetre Admin ouverte." -ForegroundColor Green

Write-Host ""
Write-Host "Tous les services sont demarres :" -ForegroundColor Cyan
Write-Host "  API      http://localhost:8000" -ForegroundColor White
Write-Host "  Frontend http://localhost:8081" -ForegroundColor White
Write-Host "  Admin    http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Pour arreter : .\run.ps1 stop" -ForegroundColor Gray