# Script de deploiement pour Synology NAS

# Chargement des variables de deploiement
$envFile = Join-Path $PSScriptRoot "..\..\. env.deploy"
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

$NETWORK_NAME = "mabibliotheque_network"

Write-Host "Deploiement sur Synology NAS" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Copier les fichiers de configuration
Write-Host "Copie des fichiers de configuration..." -ForegroundColor Yellow
Get-Content nginx.conf -Raw | ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "cat > ${SYNOLOGY_PATH}/nginx.conf"
Get-Content .env.synology -Raw | ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "cat > ${SYNOLOGY_PATH}/.env"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "mkdir -p ${SYNOLOGY_PATH}/data ${SYNOLOGY_PATH}/backups"

# Backup de la base de donnees si elle existe
Write-Host "Backup de la base de donnees..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "if [ -f ${SYNOLOGY_PATH}/data/bibliotheque.db ] && [ -s ${SYNOLOGY_PATH}/data/bibliotheque.db ]; then cp ${SYNOLOGY_PATH}/data/bibliotheque.db ${SYNOLOGY_PATH}/backups/bibliotheque_\$(date +%Y%m%d_%H%M%S).db; echo 'Backup cree'; else echo 'Pas de backup (DB vide ou inexistante)'; fi"

# Arreter les anciens conteneurs
Write-Host "Arret des anciens conteneurs..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker stop mabibliotheque-backend mabibliotheque-frontend nginx-proxy 2>/dev/null ; sudo /usr/local/bin/docker rm mabibliotheque-backend mabibliotheque-frontend nginx-proxy 2>/dev/null"

# Creer le reseau
Write-Host "Creation du reseau..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker network create ${NETWORK_NAME} 2>/dev/null"

# Telecharger l'image
Write-Host "Telechargement de la nouvelle image..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker pull llcelmarll/mabibliotheque-backend:latest"

# Demarrer le backend
Write-Host "Demarrage du backend..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name mabibliotheque-backend --network ${NETWORK_NAME} --restart unless-stopped -v ${SYNOLOGY_PATH}/data:/app/data --env-file ${SYNOLOGY_PATH}/.env llcelmarll/mabibliotheque-backend:latest"


# Demarrer le frontend (contient Nginx + fichiers statiques + proxy API)
Write-Host "Demarrage du frontend..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker pull llcelmarll/mabibliotheque-frontend:latest"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name mabibliotheque-frontend --network ${NETWORK_NAME} --restart unless-stopped -p 8080:80 llcelmarll/mabibliotheque-frontend:latest"

# Afficher le statut
Write-Host ""
Write-Host "Conteneurs deployes:" -ForegroundColor Green
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker ps --filter name=mabibliotheque --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

Write-Host ""
Write-Host "Deploiement termine !" -ForegroundColor Green
Write-Host "Acces: http://${SYNOLOGY_IP}:8080" -ForegroundColor Cyan
Write-Host "Documentation: http://${SYNOLOGY_IP}:8080/api/docs" -ForegroundColor Cyan
