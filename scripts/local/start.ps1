#!/usr/bin/env pwsh
param()

$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

Write-Host ""
Write-Host "Demarrage en mode production local (Docker Compose)..." -ForegroundColor Cyan
Set-Location $Root
docker compose --profile full up --build -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur au demarrage." -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "Application demarree :" -ForegroundColor Green
Write-Host "  API      http://localhost:8000" -ForegroundColor White
Write-Host "  Frontend http://localhost:8081" -ForegroundColor White
Write-Host ""
Write-Host "Pour arreter : .\run.ps1 stop" -ForegroundColor Gray