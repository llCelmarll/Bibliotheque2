# Script de deploiement complet
# Met a jour le backend, le frontend web, l'app mobile ET l'APK Android

param(
    [switch]$SkipBackend,
    [switch]$SkipWeb,
    [switch]$SkipMobile,
    [switch]$SkipApk,
    [string]$UpdateMessage = "Mise a jour",
    [string]$ApkPath = ""
)

Write-Host "`nDeploiement complet de l'application" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Backup de la base de donnees si elle existe
Write-Host "Backup de la base de donnees..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "if [ -f ${SYNOLOGY_PATH}/data/bibliotheque.db ] && [ -s ${SYNOLOGY_PATH}/data/bibliotheque.db ]; then cp ${SYNOLOGY_PATH}/data/bibliotheque.db ${SYNOLOGY_PATH}/backups/bibliotheque_\$(date +%Y%m%d_%H%M%S).db; echo 'Backup cree'; else echo 'Pas de backup (DB vide ou inexistante)'; fi"

# 1. Build et push de l'image Docker backend
if (-not $SkipBackend) {
    Write-Host "[1/4] Build et deploiement du backend..." -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location backend
    
    # Build multi-architecture
    Write-Host "  Build de l'image Docker (AMD64 + ARM64)..." -ForegroundColor Gray
    docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile -t llcelmarll/mabibliotheque-backend:latest --push .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors du build Docker du backend" -ForegroundColor Red
        exit 1
    }
    
    Set-Location ..
    
    # Redeploy sur le NAS
    Write-Host ""
    Write-Host "  Redeploy sur le NAS..." -ForegroundColor Gray
    & "$PSScriptRoot\redeploy-backend.ps1"
    
    Write-Host ""
    Write-Host "  Backend deploye !" -ForegroundColor Green
    Write-Host "  API URL: https://mabibliotheque.ovh/api" -ForegroundColor Gray
    Write-Host ""
}

# 2. Build et push de l'image Docker frontend (Web)
if (-not $SkipWeb) {
    Write-Host "[2/4] Build et deploiement du frontend Web..." -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location frontend
    
    # Build multi-architecture
    Write-Host "  Build de l'image Docker (AMD64 + ARM64)..." -ForegroundColor Gray
    docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile.prod -t llcelmarll/mabibliotheque-frontend:latest --push .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors du build Docker" -ForegroundColor Red
        exit 1
    }
    
    Set-Location ..
    
    # Redeploy sur le NAS
    Write-Host ""
    Write-Host "  Redeploy sur le NAS..." -ForegroundColor Gray
    & "$PSScriptRoot\redeploy-frontend.ps1"
    
    Write-Host ""
    Write-Host "  Frontend Web deploye !" -ForegroundColor Green
    Write-Host "  URL: https://mabibliotheque.ovh" -ForegroundColor Gray
    Write-Host ""
}

# 3. Publication OTA pour l'app mobile
if (-not $SkipMobile) {
    Write-Host "[3/4] Mise a jour OTA de l'app mobile..." -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location frontend
    
    $env:EXPO_PUBLIC_API_URL = "https://mabibliotheque.ovh/api"
    eas update --branch preview --message $UpdateMessage
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors de la publication OTA" -ForegroundColor Red
        exit 1
    }
    
    Set-Location ..
    
    Write-Host ""
    Write-Host "  App mobile mise a jour !" -ForegroundColor Green
    Write-Host ""
}

# 3. Configuration APK Android (redirection nginx vers EAS)
if (-not $SkipApk) {
    Write-Host "[4/4] Configuration du lien APK Android..." -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "  La redirection nginx pointe vers le dernier build EAS" -ForegroundColor Gray
    Write-Host "  URL EAS: https://expo.dev/artifacts/eas/vuBFnSsvW3JjrC452yDw9c.apk" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Pour mettre a jour l'APK, modifiez l'URL dans nginx-frontend.conf" -ForegroundColor Yellow
    Write-Host "  puis redemarrez le container frontend avec redeploy-frontend.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  APK accessible via: https://mabibliotheque.ovh/bibliotheque.apk" -ForegroundColor Green
    Write-Host ""
}

# 5. Résumé
Write-Host "[5/5] Resume du deploiement" -ForegroundColor Yellow
Write-Host ""
if (-not $SkipBackend) {
    Write-Host "  Backend API: https://mabibliotheque.ovh/api" -ForegroundColor Green
}
if (-not $SkipWeb) {
    Write-Host "  Frontend Web: https://mabibliotheque.ovh" -ForegroundColor Green
}
if (-not $SkipMobile) {
    Write-Host "  App Mobile: Mise a jour OTA publiee (branch: preview)" -ForegroundColor Green
}
if (-not $SkipApk) {
    Write-Host "  APK Android: https://mabibliotheque.ovh/bibliotheque.apk" -ForegroundColor Green
}
Write-Host ""
Write-Host "Deploiement termine !" -ForegroundColor Cyan
Write-Host ""



