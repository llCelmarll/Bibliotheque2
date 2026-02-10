# Script PowerShell pour lancer les tests frontend et backend
# Usage: .\run_tests.ps1 [-Backend] [-Frontend] [-All] [-Verbose]

param(
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$All,
    [switch]$Verbose
)

# Couleurs pour l'affichage
function Write-Success { param($Message) Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-ErrorMsg { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }

# Si aucun paramètre, afficher l'aide
if (-not ($Backend -or $Frontend -or $All)) {
    Write-Host @"

===================================
  Script de tests - Bibliotheque2
===================================

Usage:
  .\run_tests.ps1 -All           Lancer tous les tests (frontend + backend)
  .\run_tests.ps1 -Backend       Lancer les tests backend uniquement
  .\run_tests.ps1 -Frontend      Lancer les tests frontend uniquement
  .\run_tests.ps1 -Verbose       Mode verbeux avec plus de details

Exemples:
  .\run_tests.ps1 -All -Verbose  # Tous les tests avec details
  .\run_tests.ps1 -Backend       # Tests backend uniquement

"@
    exit 0
}

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

Write-Info "Repertoire racine: $rootDir"
Write-Host ""

# ====================================
# TESTS BACKEND
# ====================================
if ($Backend -or $All) {
    Write-Host "=======================================" -ForegroundColor Magenta
    Write-Host "   TESTS BACKEND (Python/pytest)      " -ForegroundColor Magenta
    Write-Host "=======================================" -ForegroundColor Magenta
    Write-Host ""

    if (-not (Test-Path $backendDir)) {
        Write-ErrorMsg "Le repertoire backend n'existe pas: $backendDir"
        exit 1
    }

    Push-Location $backendDir

    try {
        # Activer l'environnement virtuel s'il existe
        $venvPath = Join-Path $backendDir ".venv"
        if (Test-Path $venvPath) {
            Write-Info "Activation de l'environnement virtuel..."
            $activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
            if (Test-Path $activateScript) {
                & $activateScript
                Write-Success "Environnement virtuel active"
            }
        }

        # Verifier que pytest est installe
        Write-Info "Verification de pytest..."
        $pytestVersion = & python -m pytest --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "pytest trouve: $pytestVersion"
        } else {
            Write-ErrorMsg "pytest n'est pas installe. Installez-le avec: pip install pytest pytest-asyncio pytest-cov"
            Pop-Location
            exit 1
        }

        Write-Host ""
        Write-Info "Lancement des tests backend..."
        Write-Host ""

        # DATABASE_URL est requis par db.py a l'import, mais les tests
        # utilisent SQLite in-memory via conftest.py (override de get_session)
        $env:DATABASE_URL = "sqlite:///test.db"

        # Options pytest
        $pytestArgs = @("tests/", "--ignore=tests/performance/", "-v")

        if ($Verbose) {
            $pytestArgs += @("--tb=short", "-s")
        }

        # Ajouter la couverture si pytest-cov est installe
        $null = & python -c "import pytest_cov" 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pytestArgs += @("--cov=app", "--cov-report=term-missing", "--cov-report=html")
            Write-Info "Couverture de code activee"
        } else {
            Write-Warning "pytest-cov non installe, tests sans couverture"
        }

        Write-Info "Commande: python -m pytest $($pytestArgs -join ' ')"
        Write-Host ""

        & python -m pytest @pytestArgs

        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Success "Tests backend reussis!"
            Write-Info "Rapport de couverture genere dans: backend/htmlcov/index.html"
        } else {
            Write-Host ""
            Write-ErrorMsg "Tests backend echoues! Consultez les logs ci-dessus."
            Pop-Location
            exit 1
        }

    } finally {
        Pop-Location
    }

    Write-Host ""
}

# ====================================
# TESTS FRONTEND
# ====================================
if ($Frontend -or $All) {
    Write-Host "=======================================" -ForegroundColor Magenta
    Write-Host "   TESTS FRONTEND (Jest/React)        " -ForegroundColor Magenta
    Write-Host "=======================================" -ForegroundColor Magenta
    Write-Host ""

    if (-not (Test-Path $frontendDir)) {
        Write-ErrorMsg "Le repertoire frontend n'existe pas: $frontendDir"
        exit 1
    }

    Push-Location $frontendDir

    try {
        # Verifier que npm est installe
        Write-Info "Verification de npm..."
        $npmVersion = & npm --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "npm trouve: v$npmVersion"
        } else {
            Write-ErrorMsg "npm n'est pas installe"
            Pop-Location
            exit 1
        }

        # Verifier que les node_modules existent
        if (-not (Test-Path "node_modules")) {
            Write-Warning "node_modules non trouve. Installation des dependances..."
            & npm install
        }

        Write-Host ""
        Write-Info "Lancement des tests frontend..."
        Write-Host ""

        # Options Jest - exécution séquentielle pour éviter les race conditions
        # La configuration maxWorkers=1 est déjà dans jest.config.json
        if ($Verbose) {
            & npm test:verbose -- --verbose 

        } else {
            & npm test -- --coverage
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Success "Tests frontend reussis!"
            Write-Info "Rapport de couverture genere dans: frontend/coverage/"
        } else {
            Write-Host ""
            Write-ErrorMsg "Tests frontend echoues! Consultez les logs ci-dessus."
            Pop-Location
            exit 1
        }

    } finally {
        Pop-Location
    }

    Write-Host ""
}

# ====================================
# RESUME
# ====================================
Write-Host "=======================================" -ForegroundColor Magenta
Write-Host "             RESUME DES TESTS          " -ForegroundColor Magenta
Write-Host "=======================================" -ForegroundColor Magenta
Write-Host ""

if ($Backend -or $All) {
    Write-Success "Backend: Tous les tests sont passes"
    Write-Info "  - Tests unitaires"
    Write-Info "  - Tests d'integration"
    Write-Info "  - Detection de livres similaires"
}

if ($Frontend -or $All) {
    Write-Success "Frontend: Tous les tests sont passes"
    Write-Info "  - Composants React"
    Write-Info "  - Hooks personnalises"
    Write-Info "  - Services API"
}

Write-Host ""
Write-Success "Tous les tests sont passes avec succes!"
Write-Host ""
