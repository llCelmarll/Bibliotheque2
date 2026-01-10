# Script de redeploiement du backend uniquement
# Redemarre le container backend sur le NAS Synology avec la derniere image

Write-Host "`nRedeploiement du backend..." -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Configuration du serveur NAS
$NAS_HOST = "192.168.1.124"
$NAS_USER = "QuentinDDC"
$NAS_PATH = "/volume1/docker/mabibliotheque"
$CONTAINER_NAME = "mabibliotheque-backend"

Write-Host "Serveur: $NAS_HOST" -ForegroundColor Gray
Write-Host "Container: $CONTAINER_NAME" -ForegroundColor Gray
Write-Host "Chemin NAS: $NAS_PATH" -ForegroundColor Gray
Write-Host ""

# 0. Backup de la base de donnees AVANT tout
Write-Host "[0/4] Backup de la base de donnees..." -ForegroundColor Yellow
ssh "${NAS_USER}@${NAS_HOST}" 'mkdir -p /volume1/docker/mabibliotheque/backups && if [ -f /volume1/docker/mabibliotheque/data/bibliotheque.db ] && [ -s /volume1/docker/mabibliotheque/data/bibliotheque.db ]; then cp /volume1/docker/mabibliotheque/data/bibliotheque.db /volume1/docker/mabibliotheque/backups/bibliotheque_$(date +%Y%m%d_%H%M%S).db && echo "Backup cree" || echo "Erreur backup"; else echo "Pas de DB a sauvegarder"; fi'

Write-Host ""

# 1. Arret et suppression du container existant
Write-Host "[1/4] Arret et suppression du container existant..." -ForegroundColor Yellow
ssh "${NAS_USER}@${NAS_HOST}" "sudo /usr/local/bin/docker stop $CONTAINER_NAME 2>/dev/null; sudo /usr/local/bin/docker rm $CONTAINER_NAME 2>/dev/null"

# 2. Pull de la derniere image
Write-Host "[2/4] Pull de la derniere image Docker..." -ForegroundColor Yellow
ssh "${NAS_USER}@${NAS_HOST}" "sudo /usr/local/bin/docker pull llcelmarll/mabibliotheque-backend:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du pull de l'image" -ForegroundColor Red
    exit 1
}

# 3. Verification des variables d'environnement critiques
Write-Host ""
Write-Host "[3/4] Verification de la configuration..." -ForegroundColor Yellow
$envCheck = ssh "${NAS_USER}@${NAS_HOST}" "grep -E '(DATABASE_URL|SECRET_KEY)' ${NAS_PATH}/.env 2>/dev/null | wc -l"
if ([int]$envCheck -lt 2) {
    Write-Host "ATTENTION: Fichier .env manquant ou incomplet sur le NAS !" -ForegroundColor Red
    Write-Host "   Verifiez que ${NAS_PATH}/.env contient:" -ForegroundColor Yellow
    Write-Host "   - DATABASE_URL=sqlite:///./data/bibliotheque.db" -ForegroundColor Gray
    Write-Host "   - SECRET_KEY=..." -ForegroundColor Gray
    Write-Host ""
    $response = Read-Host "Continuer quand meme ? (y/N)"
    if ($response -ne 'y') {
        exit 1
    }
}

# 4. Redemarrage du container
Write-Host ""
Write-Host "[4/4] Redemarrage du container..." -ForegroundColor Yellow
# S'assurer que le réseau existe
ssh "${NAS_USER}@${NAS_HOST}" "sudo /usr/local/bin/docker network create mabibliotheque_network 2>/dev/null || true"

ssh "${NAS_USER}@${NAS_HOST}" "sudo /usr/local/bin/docker run -d --name $CONTAINER_NAME --network mabibliotheque_network --restart unless-stopped -v ${NAS_PATH}/data:/app/data --env-file ${NAS_PATH}/.env llcelmarll/mabibliotheque-backend:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du redemarrage du container" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Backend redeploye avec succes !" -ForegroundColor Green
Write-Host "API disponible sur: https://mabibliotheque.ovh/api" -ForegroundColor Gray
Write-Host ""

# Verification de la sante du container
Write-Host "Verification de la sante du container..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
ssh "${NAS_USER}@${NAS_HOST}" "sudo /usr/local/bin/docker ps --filter name=$CONTAINER_NAME --format 'Status: {{.Status}}'"

Write-Host ""
Write-Host "Termine !" -ForegroundColor Cyan
