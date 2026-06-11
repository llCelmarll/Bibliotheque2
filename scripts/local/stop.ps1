#!/usr/bin/env pwsh
param()

$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

Write-Host ""
Write-Host "Arret des conteneurs Docker..." -ForegroundColor Yellow
Set-Location $Root
docker compose down
Write-Host "Conteneurs arretes." -ForegroundColor Green
Write-Host ""
Write-Host "Note : les fenetres Backend / Frontend / Admin doivent etre fermees manuellement." -ForegroundColor Gray