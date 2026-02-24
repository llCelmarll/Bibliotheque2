# Mise a jour de la whitelist ALLOWED_EMAILS sur le NAS
# Pousse le .env.synology local et recrée le conteneur backend
# Usage: .\update-whitelist.ps1

$SYNOLOGY_USER = "QuentinDDC"
$SYNOLOGY_HOST = "NAS"
$SYNOLOGY_PATH = "/volume1/docker/mabibliotheque"
$CONTAINER_NAME = "mabibliotheque-backend"
$envSynologyPath = Join-Path $PSScriptRoot "..\..\.env.synology"

if (-not (Test-Path $envSynologyPath)) {
    Write-Host "Erreur: .env.synology introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "`nMise a jour de la whitelist..." -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Afficher la whitelist locale
$allowedEmails = Get-Content $envSynologyPath | Where-Object { $_ -match "^ALLOWED_EMAILS=" } | ForEach-Object { $_ -replace "^ALLOWED_EMAILS=", "" }
Write-Host "Whitelist locale:" -ForegroundColor Yellow
$allowedEmails -split "," | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
Write-Host ""

# 1. Push du .env.synology sur le NAS
Write-Host "[1/3] Push du .env sur le NAS..." -ForegroundColor Yellow
Get-Content $envSynologyPath -Raw | ssh "${SYNOLOGY_USER}@${SYNOLOGY_HOST}" "cat > ${SYNOLOGY_PATH}/.env"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du push du .env" -ForegroundColor Red
    exit 1
}
Write-Host "  OK" -ForegroundColor Green

# 2. Supprimer et recréer le conteneur (pour recharger les variables)
Write-Host "[2/3] Recreation du conteneur backend..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_HOST}" "sudo /usr/local/bin/docker stop $CONTAINER_NAME 2>/dev/null; sudo /usr/local/bin/docker rm $CONTAINER_NAME 2>/dev/null"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_HOST}" "sudo /usr/local/bin/docker run -d --name $CONTAINER_NAME --network mabibliotheque_network --restart unless-stopped -v ${SYNOLOGY_PATH}/data:/app/data --env-file ${SYNOLOGY_PATH}/.env llcelmarll/mabibliotheque-backend:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la recreation du conteneur" -ForegroundColor Red
    exit 1
}
Write-Host "  OK" -ForegroundColor Green

# 3. Vérification
Write-Host "[3/3] Verification..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
$containerEmails = ssh "${SYNOLOGY_USER}@${SYNOLOGY_HOST}" "sudo /usr/local/bin/docker exec $CONTAINER_NAME env | grep ALLOWED_EMAILS"
Write-Host "  $containerEmails" -ForegroundColor Gray

Write-Host ""
Write-Host "Whitelist mise a jour avec succes !" -ForegroundColor Green
Write-Host ""
