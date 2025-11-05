# Script de deploiement complet
# Met a jour le frontend web, l'app mobile ET l'APK Android

param(
    [switch]$SkipWeb,
    [switch]$SkipMobile,
    [switch]$SkipApk,
    [string]$UpdateMessage = "Mise a jour",
    [string]$ApkPath = ""
)

Write-Host "`nDeploiement complet de l'application" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Build et push de l'image Docker frontend (Web)
if (-not $SkipWeb) {
    Write-Host "[1/3] Build et deploiement du frontend Web..." -ForegroundColor Yellow
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
    .\redeploy-frontend.ps1
    
    Write-Host ""
    Write-Host "  Frontend Web deploye !" -ForegroundColor Green
    Write-Host "  URL: https://mabibliotheque.ovh" -ForegroundColor Gray
    Write-Host ""
}

# 2. Publication OTA pour l'app mobile
if (-not $SkipMobile) {
    Write-Host "[2/3] Mise a jour OTA de l'app mobile..." -ForegroundColor Yellow
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
    Write-Host "[3/4] Configuration du lien APK Android..." -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "  La redirection nginx pointe vers le dernier build EAS" -ForegroundColor Gray
    Write-Host "  URL EAS: https://expo.dev/artifacts/eas/oJGWpnV1j1Yr7KJcapRs4L.apk" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Pour mettre a jour l'APK, modifiez l'URL dans nginx-frontend.conf" -ForegroundColor Yellow
    Write-Host "  puis redemarrez le container frontend avec redeploy-frontend.ps1" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  APK accessible via: https://mabibliotheque.ovh/bibliotheque.apk" -ForegroundColor Green
    Write-Host ""
}

# 4. Résumé
Write-Host "[4/4] Resume du deploiement" -ForegroundColor Yellow
Write-Host ""
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
