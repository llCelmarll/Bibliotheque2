# Script de build et deploiement du frontend

$SYNOLOGY_USER = "QuentinDDC"
$SYNOLOGY_IP = "192.168.1.124"
$SYNOLOGY_PATH = "/volume1/docker/mabibliotheque/frontend"

Write-Host "Build et deploiement du Frontend" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Build du frontend
Write-Host "Build du frontend web..." -ForegroundColor Yellow
Set-Location frontend
npx expo export --platform web

# Creation du dossier sur le NAS
Write-Host "Creation du dossier sur le NAS..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "mkdir -p ${SYNOLOGY_PATH}"

# Copie des fichiers via rsync ou tar
Write-Host "Copie des fichiers..." -ForegroundColor Yellow
tar -czf ../frontend-dist.tar.gz -C dist .
scp ../frontend-dist.tar.gz "${SYNOLOGY_USER}@${SYNOLOGY_IP}:${SYNOLOGY_PATH}/"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "cd ${SYNOLOGY_PATH} && tar -xzf frontend-dist.tar.gz && rm frontend-dist.tar.gz"

Set-Location ..
Remove-Item frontend-dist.tar.gz

Write-Host ""
Write-Host "Frontend deploye !" -ForegroundColor Green
Write-Host "Les fichiers statiques sont dans: ${SYNOLOGY_PATH}" -ForegroundColor Gray
Write-Host ""
Write-Host "Prochaine etape: Configurer Nginx pour servir le frontend" -ForegroundColor Yellow
