# Script de deploiement STAGING complet
# Build les images :staging, les pousse sur Docker Hub, puis redeploy sur le NAS.
# Ne touche PAS la production (conteneurs, branches git, OTA mobile).
#
# Usage:
#   .\deploy-all-staging.ps1                  # deployer backend + frontend + OTA
#   .\deploy-all-staging.ps1 -BackendOnly     # backend uniquement
#   .\deploy-all-staging.ps1 -FrontendOnly    # frontend uniquement
#   .\deploy-all-staging.ps1 -OtaOnly         # OTA mobile uniquement (pas de rebuild Docker)
#   .\deploy-all-staging.ps1 -DryRun          # afficher le plan sans executer

param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$OtaOnly,
    [string]$UpdateMessage,
    [switch]$DryRun
)

# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

function Start-DockerIfNeeded {
    Write-Host "Verification de Docker Desktop..." -ForegroundColor Gray
    try {
        $null = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Docker Desktop est deja en cours d'execution" -ForegroundColor Green
            return $true
        }
    } catch {}

    Write-Host "  Docker Desktop n'est pas en cours d'execution. Lancement..." -ForegroundColor Yellow
    $dockerPaths = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    )
    $dockerExe = $dockerPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $dockerExe) {
        Write-Host "  Erreur: Docker Desktop introuvable. Lancez-le manuellement." -ForegroundColor Red
        return $false
    }
    Start-Process -FilePath $dockerExe
    Write-Host "  Attente du demarrage de Docker Desktop..." -ForegroundColor Yellow
    $maxAttempts = 60
    $attempts = 0
    while ($attempts -lt $maxAttempts) {
        Start-Sleep -Seconds 2
        try {
            $null = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Docker Desktop pret !" -ForegroundColor Green
                return $true
            }
        } catch {}
        $attempts++
        Write-Host "  ." -NoNewline -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "  Timeout: Docker Desktop n'a pas demarre" -ForegroundColor Red
    return $false
}

# ---------------------------------------------------------------------------
# CHARGEMENT DE LA CONFIGURATION
# ---------------------------------------------------------------------------

$envFile = Join-Path $PSScriptRoot "..\..\..\\.env.deploy"
if (-not (Test-Path $envFile)) {
    $envFile = Join-Path $PSScriptRoot ".env.deploy"
}
if (-not (Test-Path $envFile)) {
    Write-Host "Erreur: fichier .env.deploy introuvable" -ForegroundColor Red
    Write-Host "Copiez .env.deploy.example vers .env.deploy et configurez vos valeurs" -ForegroundColor Yellow
    exit 1
}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        Set-Variable -Name $Matches[1].Trim() -Value $Matches[2].Trim()
        [Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), "Process")
    }
}

$deployBackend  = -not $FrontendOnly -and -not $OtaOnly
$deployFrontend = -not $BackendOnly -and -not $OtaOnly
$deployOta      = -not $BackendOnly
$repoRoot       = Join-Path $PSScriptRoot "..\..\..\"
$STAGING_API_URL = "http://${SYNOLOGY_IP}:8090/api"

if (-not $UpdateMessage) {
    $UpdateMessage = (git log --format='%s' -1 2>$null) -replace '"', "'"
    if (-not $UpdateMessage) { $UpdateMessage = "Staging update" }
}

# ---------------------------------------------------------------------------
# RESUME
# ---------------------------------------------------------------------------

Write-Host "`nDeploy STAGING" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "  Backend:  $(if ($deployBackend)  {'[OUI]'} else {'[NON]'})" -ForegroundColor $(if ($deployBackend)  {'Green'} else {'DarkGray'})
Write-Host "  Frontend: $(if ($deployFrontend) {'[OUI]'} else {'[NON]'})" -ForegroundColor $(if ($deployFrontend) {'Green'} else {'DarkGray'})
Write-Host "  OTA:      $(if ($deployOta)      {'[OUI] ' + $UpdateMessage} else {'[NON]'})" -ForegroundColor $(if ($deployOta) {'Green'} else {'DarkGray'})
Write-Host "  Branche:  $(git rev-parse --abbrev-ref HEAD 2>$null) @ $(git log --format='%h %s' -1 2>$null)" -ForegroundColor Gray
Write-Host "  API URL:  $STAGING_API_URL" -ForegroundColor Gray
Write-Host ""

if ($DryRun) {
    Write-Host "[DryRun] Aucune action executee." -ForegroundColor Cyan
    exit 0
}

$confirm = Read-Host "Confirmer le deploiement staging ? (O/N)"
if ($confirm -notmatch '^[oO]$') {
    Write-Host "Annule." -ForegroundColor Yellow
    exit 0
}

if (-not (Start-DockerIfNeeded)) {
    Write-Host "Impossible de continuer sans Docker Desktop" -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------------
# [1] BACKEND
# ---------------------------------------------------------------------------

if ($deployBackend) {
    Write-Host "`n[1/2] Build et deploiement du backend STAGING..." -ForegroundColor Yellow
    Write-Host ""

    $backendDir = Join-Path $repoRoot "backend"
    Set-Location $backendDir

    # Copier le changelog dans backend/docs pour le bake dans l'image
    if (-not (Test-Path "docs")) { New-Item -ItemType Directory -Path "docs" | Out-Null }
    Copy-Item -Path (Join-Path $repoRoot "docs\CHANGELOG.json") -Destination "docs\CHANGELOG.json" -Force

    Write-Host "  Build llcelmarll/mabibliotheque-backend:staging (AMD64 + ARM64)..." -ForegroundColor Gray
    docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile -t llcelmarll/mabibliotheque-backend:staging --push .

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors du build backend staging" -ForegroundColor Red
        Set-Location $repoRoot
        exit 1
    }

    Set-Location $repoRoot

    Write-Host ""
    Write-Host "  Redeploy sur le NAS..." -ForegroundColor Gray
    & "$PSScriptRoot\redeploy-staging-backend.ps1"
    if ($LASTEXITCODE -ne 0) { exit 1 }

    Write-Host ""
    Write-Host "  Backend staging deploye !" -ForegroundColor Green
    Write-Host "  API: $STAGING_API_URL" -ForegroundColor Gray
    Write-Host ""
}

# ---------------------------------------------------------------------------
# [2] FRONTEND WEB
# ---------------------------------------------------------------------------

if ($deployFrontend) {
    Write-Host "`n[2/2] Build et deploiement du frontend STAGING..." -ForegroundColor Yellow
    Write-Host ""

    $frontendDir = Join-Path $repoRoot "frontend"
    Set-Location $frontendDir

    Write-Host "  Build llcelmarll/mabibliotheque-frontend:staging (AMD64 + ARM64)..." -ForegroundColor Gray
    Write-Host "  Nginx config: nginx-frontend-staging.conf" -ForegroundColor Gray
    Write-Host "  API URL baked in: $STAGING_API_URL" -ForegroundColor Gray

    docker buildx build `
        --platform linux/amd64,linux/arm64 `
        -f Dockerfile.prod `
        --build-arg NGINX_CONF=nginx-frontend-staging.conf `
        --build-arg EXPO_PUBLIC_API_URL=$STAGING_API_URL `
        --build-arg EXPO_PUBLIC_APK_FILENAME=bibliotheque-staging.apk `
        -t llcelmarll/mabibliotheque-frontend:staging `
        --push .

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors du build frontend staging" -ForegroundColor Red
        Set-Location $repoRoot
        exit 1
    }

    Set-Location $repoRoot

    Write-Host ""
    Write-Host "  Redeploy sur le NAS..." -ForegroundColor Gray
    & "$PSScriptRoot\redeploy-staging-frontend.ps1"
    if ($LASTEXITCODE -ne 0) { exit 1 }

    Write-Host ""
    Write-Host "  Frontend staging deploye !" -ForegroundColor Green
    Write-Host "  URL: http://${SYNOLOGY_IP}:8090" -ForegroundColor Gray
    Write-Host ""
}

# ---------------------------------------------------------------------------
# [3] OTA MOBILE
# ---------------------------------------------------------------------------

if ($deployOta) {
    Write-Host "`n[3/3] Mise a jour OTA mobile STAGING..." -ForegroundColor Yellow
    Write-Host ""

    Set-Location (Join-Path $repoRoot "frontend")
    $env:EXPO_PUBLIC_API_URL = $STAGING_API_URL
    eas update --branch staging --message $UpdateMessage

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors de la publication OTA staging" -ForegroundColor Red
        Set-Location $repoRoot
        exit 1
    }

    Set-Location $repoRoot
    Write-Host ""
    Write-Host "  OTA staging publiee (branch: staging)" -ForegroundColor Green
    Write-Host ""
}

# ---------------------------------------------------------------------------
# RESUME FINAL
# ---------------------------------------------------------------------------

Write-Host "[Resume] Staging deploye !" -ForegroundColor Cyan
Write-Host ""
if ($deployBackend)  { Write-Host "  Backend:  $STAGING_API_URL" -ForegroundColor Green }
if ($deployFrontend) { Write-Host "  Frontend: http://${SYNOLOGY_IP}:8090" -ForegroundColor Green }
if ($deployOta)      { Write-Host "  OTA:      Publiee sur branch staging" -ForegroundColor Green }
Write-Host ""
