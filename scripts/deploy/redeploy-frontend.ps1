# Script de rebuild et redeploy du frontend uniquement
# Utilise pour mettre a jour rapidement le frontend sans toucher au backend

$SYNOLOGY_USER = "QuentinDDC"
$SYNOLOGY_IP = "192.168.1.124"

Write-Host "`nRedeploy Frontend uniquement" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Rebuild et redeploy frontend
Write-Host "`nRebuild de l'image frontend..." -ForegroundColor Yellow

# Stop et suppression de l'ancien conteneur
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker stop mabibliotheque-frontend 2>/dev/null ; sudo /usr/local/bin/docker rm mabibliotheque-frontend 2>/dev/null"

# Pull de la nouvelle image
Write-Host "Pull de la nouvelle image..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker pull llcelmarll/mabibliotheque-frontend:latest"

# Demarrage du nouveau conteneur avec volume APK
Write-Host "Demarrage du conteneur..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name mabibliotheque-frontend --network mabibliotheque_network --restart unless-stopped -p 8080:80 -v /volume1/docker/mabibliotheque/apk:/app/apk:ro llcelmarll/mabibliotheque-frontend:latest"

Write-Host "`nFrontend redeploy !" -ForegroundColor Green
Write-Host "Accessible sur: https://mabibliotheque.ovh`n" -ForegroundColor Gray
