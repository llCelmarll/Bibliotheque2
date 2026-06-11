#!/usr/bin/env pwsh
param(
    [Parameter(Position=0)]
    [ValidateSet('setup', 'start', 'dev', 'stop', 'deploy', 'deploy-backend', 'deploy-web', 'deploy-mobile', 'test', 'help')]
    [string]$Command = 'help',
    [string]$Message = "Mise a jour"
)

function Show-Header {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "       Bibliotheque Manager           " -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    Show-Header
    Write-Host "Commandes disponibles :" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Configuration et Developpement" -ForegroundColor Cyan
    Write-Host "     setup              Configuration initiale (premiere fois)" -ForegroundColor White
    Write-Host "     start              Demarrer l'application (mode production)" -ForegroundColor White
    Write-Host "     dev                Demarrer en mode developpement (hot-reload)" -ForegroundColor White
    Write-Host "     stop               Arreter l'application" -ForegroundColor White
    Write-Host ""
    Write-Host "  Deploiement" -ForegroundColor Cyan
    Write-Host "     deploy             Deploiement complet (Backend + Web + Mobile)" -ForegroundColor White
    Write-Host "     deploy-backend     Deployer uniquement le backend API" -ForegroundColor White
    Write-Host "     deploy-web         Deployer uniquement le frontend web" -ForegroundColor White
    Write-Host "     deploy-mobile      Mise a jour OTA mobile uniquement" -ForegroundColor White
    Write-Host ""
    Write-Host "  Utilitaires" -ForegroundColor Cyan
    Write-Host "     test               Tester la configuration Docker" -ForegroundColor White
    Write-Host "     help               Afficher cette aide" -ForegroundColor White
    Write-Host ""
    Write-Host "Exemples :" -ForegroundColor Yellow
    Write-Host "  .\run.ps1 setup" -ForegroundColor Gray
    Write-Host "  .\run.ps1 dev" -ForegroundColor Gray
    Write-Host "  .\run.ps1 deploy -Message `"Correction bug import CSV`"" -ForegroundColor Gray
    Write-Host ""
}

switch ($Command) {
    'setup' {
        Show-Header
        Write-Host "Configuration initiale..." -ForegroundColor Yellow
        & ".\scripts\setup-env.ps1"
    }
    'start' {
        Show-Header
        Write-Host "Demarrage de l'application (mode production)..." -ForegroundColor Green
        & ".\scripts\local\start.ps1"
    }
    'dev' {
        Show-Header
        Write-Host "Demarrage en mode developpement..." -ForegroundColor Green
        & ".\scripts\local\dev.ps1"
    }
    'stop' {
        Show-Header
        Write-Host "Arret de l'application..." -ForegroundColor Red
        & ".\scripts\local\stop.ps1"
    }
    'deploy' {
        Show-Header
        Write-Host "Deploiement complet (Backend + Web + Mobile)..." -ForegroundColor Green
        & ".\scripts\deploy\deploy-all.ps1" -UpdateMessage $Message
    }
    'deploy-backend' {
        Show-Header
        Write-Host "Deploiement backend API..." -ForegroundColor Green
        & ".\scripts\deploy\redeploy-backend.ps1"
    }
    'deploy-web' {
        Show-Header
        Write-Host "Deploiement frontend web..." -ForegroundColor Green
        & ".\scripts\deploy\redeploy-frontend.ps1"
    }
    'deploy-mobile' {
        Show-Header
        Write-Host "Mise a jour mobile OTA..." -ForegroundColor Green
        Set-Location frontend
        $env:EXPO_PUBLIC_API_URL = "https://mabibliotheque.ovh/api"
        eas update --branch preview --message $Message
        Set-Location ..
    }
    'test' {
        Show-Header
        Write-Host "Test de la configuration Docker..." -ForegroundColor Yellow
        & ".\scripts\test-docker.ps1"
    }
    'help' {
        Show-Help
    }
}