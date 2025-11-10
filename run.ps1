#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script principal de gestion de l'application Bibliothèque

.DESCRIPTION
    Interface simplifiée pour gérer le développement local et le déploiement

.EXAMPLE
    .\run.ps1 setup      # Configuration initiale
    .\run.ps1 start      # Démarrer l'application
    .\run.ps1 dev        # Démarrer en mode développement
    .\run.ps1 stop       # Arrêter l'application
    .\run.ps1 deploy     # Déployer en production
    .\run.ps1 help       # Afficher l'aide
#>

param(
    [Parameter(Position=0)]
    [ValidateSet('setup', 'start', 'dev', 'stop', 'deploy', 'deploy-backend', 'deploy-web', 'deploy-mobile', 'test', 'help')]
    [string]$Command = 'help',
    
    [string]$Message = "Mise à jour"
)

function Show-Header {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║     📚 Bibliothèque Manager          ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    Show-Header
    Write-Host "Commandes disponibles :" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  🔧 Configuration & Développement" -ForegroundColor Cyan
    Write-Host "     setup              Configuration initiale (première fois)" -ForegroundColor White
    Write-Host "     start              Démarrer l'application (mode production)" -ForegroundColor White
    Write-Host "     dev                Démarrer en mode développement (hot-reload)" -ForegroundColor White
    Write-Host "     stop               Arrêter l'application" -ForegroundColor White
    Write-Host ""
    Write-Host "  🚀 Déploiement" -ForegroundColor Cyan
    Write-Host "     deploy             Déploiement complet (Backend + Web + Mobile)" -ForegroundColor White
    Write-Host "     deploy-backend     Déployer uniquement le backend API" -ForegroundColor White
    Write-Host "     deploy-web         Déployer uniquement le frontend web" -ForegroundColor White
    Write-Host "     deploy-mobile      Mise à jour OTA mobile uniquement" -ForegroundColor White
    Write-Host ""
    Write-Host "  🧪 Utilitaires" -ForegroundColor Cyan
    Write-Host "     test               Tester la configuration Docker" -ForegroundColor White
    Write-Host "     help               Afficher cette aide" -ForegroundColor White
    Write-Host ""
    Write-Host "Exemples :" -ForegroundColor Yellow
    Write-Host "  .\run.ps1 setup" -ForegroundColor Gray
    Write-Host "  .\run.ps1 dev" -ForegroundColor Gray
    Write-Host "  .\run.ps1 deploy -Message ""Correction bug import CSV""" -ForegroundColor Gray
    Write-Host ""
}

# Exécution des commandes
switch ($Command) {
    'setup' {
        Show-Header
        Write-Host "⚙️  Configuration initiale..." -ForegroundColor Yellow
        & ".\scripts\setup-env.ps1"
    }
    
    'start' {
        Show-Header
        Write-Host "🚀 Démarrage de l'application (mode production)..." -ForegroundColor Green
        & ".\scripts\local\start.ps1"
    }
    
    'dev' {
        Show-Header
        Write-Host "🔨 Démarrage en mode développement..." -ForegroundColor Green
        & ".\scripts\local\dev.ps1"
    }
    
    'stop' {
        Show-Header
        Write-Host "🛑 Arrêt de l'application..." -ForegroundColor Red
        & ".\scripts\local\stop.ps1"
    }
    
    'deploy' {
        Show-Header
        Write-Host "🚀 Déploiement complet (Backend + Web + Mobile)..." -ForegroundColor Green
        & ".\scripts\deploy\deploy-all.ps1" -UpdateMessage $Message
    }
    
    'deploy-backend' {
        Show-Header
        Write-Host "⚙️  Déploiement backend API..." -ForegroundColor Green
        & ".\scripts\deploy\redeploy-backend.ps1"
    }
    
    'deploy-web' {
        Show-Header
        Write-Host "🌐 Déploiement frontend web..." -ForegroundColor Green
        & ".\scripts\deploy\redeploy-frontend.ps1"
    }
    
    'deploy-mobile' {
        Show-Header
        Write-Host "📱 Mise à jour mobile OTA..." -ForegroundColor Green
        Set-Location frontend
        $env:EXPO_PUBLIC_API_URL = "https://mabibliotheque.ovh/api"
        eas update --branch preview --message $Message
        Set-Location ..
    }
    
    'test' {
        Show-Header
        Write-Host "🧪 Test de la configuration Docker..." -ForegroundColor Yellow
        & ".\scripts\test-docker.ps1"
    }
    
    'help' {
        Show-Help
    }
}
