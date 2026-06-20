#!/usr/bin/env pwsh
param(
    [Parameter(Position=0)]
    [ValidateSet('setup', 'start', 'dev', 'stop', 'restart', 'restart-backend', 'restart-admin', 'restart-frontend', 'deploy', 'deploy-backend', 'deploy-web', 'deploy-mobile', 'test', 'help')]
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
    Write-Host "     restart            Redemarrer tous les composants" -ForegroundColor White
    Write-Host "     restart-backend    Redemarrer uniquement le backend (FastAPI)" -ForegroundColor White
    Write-Host "     restart-admin      Redemarrer uniquement le frontend admin (Vite)" -ForegroundColor White
    Write-Host "     restart-frontend   Redemarrer uniquement le frontend mobile (Expo)" -ForegroundColor White
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
    'restart' {
        Show-Header
        Write-Host "Redemarrage de tous les composants..." -ForegroundColor Yellow
        & ".\scripts\local\stop.ps1"
        Start-Sleep -Seconds 2
        & ".\scripts\local\dev.ps1"
    }
    'restart-backend' {
        Show-Header
        $Root = Resolve-Path "."
        $BackendDir = Join-Path $Root "backend"
        $VenvActivate = Join-Path $Root ".venv\Scripts\Activate.ps1"
        $Title = "Backend :8000"
        # Vérifier si le backend tourne déjà (avec --reload, il se recharge tout seul)
        $conn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) {
            Write-Host "Backend déjà en cours — uvicorn --reload détecte les changements automatiquement." -ForegroundColor Green
            Write-Host "Pour forcer un redémarrage complet : fermez la fenêtre 'Backend :8000' puis relancez .\run.ps1 dev" -ForegroundColor Gray
        } else {
            Write-Host "Backend non détecté, démarrage..." -ForegroundColor Yellow
            $Cmd = "& '$VenvActivate'; Get-Content .env | ForEach-Object { if (`$_ -match '^\s*([^#][^=]+)=(.*)$') { [Environment]::SetEnvironmentVariable(`$matches[1].Trim(), `$matches[2].Trim(), 'Process') } }; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = '$Title'; Set-Location '$BackendDir'; $Cmd"
            Write-Host "Backend démarré — http://localhost:8000" -ForegroundColor Green
        }
    }
    'restart-admin' {
        Show-Header
        $Root = Resolve-Path "."
        $AdminDir = Join-Path $Root "frontend-admin"
        $Title = "Admin :3001"
        # Tuer uniquement le process Vite sur le port (pas le parent PowerShell)
        Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = '$Title'; Set-Location '$AdminDir'; npm run dev"
        Write-Host "Admin redémarre — http://localhost:3001" -ForegroundColor Green
    }
    'restart-frontend' {
        Show-Header
        $Root = Resolve-Path "."
        $FrontendDir = Join-Path $Root "frontend"
        $Title = "Frontend :8081"
        # Tuer uniquement le process Metro sur le port (pas le parent PowerShell)
        Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = '$Title'; Set-Location '$FrontendDir'; `$env:BROWSER='none'; npx expo start --web"
        Write-Host "Frontend redémarre — http://localhost:8081" -ForegroundColor Green
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