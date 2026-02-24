# Script de deploiement pour Synology NAS (avec PostgreSQL)

# Configuration Synology (Hardcoded ou surchargeable)
if ($env:SYNOLOGY_USER) { $SYNOLOGY_USER = $env:SYNOLOGY_USER } else { $SYNOLOGY_USER = "QuentinDDC" }
if ($env:SYNOLOGY_IP) { $SYNOLOGY_IP = $env:SYNOLOGY_IP } else { $SYNOLOGY_IP = "192.168.1.124" }
if ($env:SYNOLOGY_PATH) { $SYNOLOGY_PATH = $env:SYNOLOGY_PATH } else { $SYNOLOGY_PATH = "/volume1/docker/mabibliotheque" }

# Charger les variables Synology depuis .env.synology pour PostgreSQL
$synologyEnvFile = Join-Path $PSScriptRoot "..\..\.env.synology"
$POSTGRES_PASSWORD = ""
$POSTGRES_USER = "bibliotheque"
if (Test-Path $synologyEnvFile) {
    Get-Content $synologyEnvFile | ForEach-Object {
        if ($_ -match '^\s*POSTGRES_PASSWORD=(.*)$') {
            $POSTGRES_PASSWORD = $Matches[1].Trim()
        }
        if ($_ -match '^\s*POSTGRES_USER=(.*)$') {
            $POSTGRES_USER = $Matches[1].Trim()
        }
    }
}

$NETWORK_NAME = "mabibliotheque_network"

Write-Host "Deploiement sur Synology NAS" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Copier les fichiers de configuration
Write-Host "Copie des fichiers de configuration..." -ForegroundColor Yellow
Get-Content (Join-Path $PSScriptRoot "..\..\nginx.conf") -Raw | ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "cat > ${SYNOLOGY_PATH}/nginx.conf"
Get-Content (Join-Path $PSScriptRoot "..\..\.env.synology") -Raw | ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "cat > ${SYNOLOGY_PATH}/.env"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "mkdir -p ${SYNOLOGY_PATH}/data ${SYNOLOGY_PATH}/backups"

# Backup PostgreSQL si le conteneur existe
Write-Host "Backup de la base de donnees..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "if sudo /usr/local/bin/docker ps -a --format '{{.Names}}' | grep -q mabibliotheque-postgres; then sudo /usr/local/bin/docker exec mabibliotheque-postgres pg_dump -U ${POSTGRES_USER} bibliotheque > ${SYNOLOGY_PATH}/backups/bibliotheque_`$(date +%Y%m%d_%H%M%S).sql && echo 'Backup PostgreSQL cree'; else echo 'Pas de conteneur PostgreSQL existant'; fi"

# Arreter les anciens conteneurs (backend + frontend, PAS postgres)
Write-Host "Arret des anciens conteneurs..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker stop mabibliotheque-backend mabibliotheque-frontend nginx-proxy 2>/dev/null ; sudo /usr/local/bin/docker rm mabibliotheque-backend mabibliotheque-frontend nginx-proxy 2>/dev/null"

# Creer le reseau
Write-Host "Creation du reseau..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker network create ${NETWORK_NAME} 2>/dev/null"

# Demarrer PostgreSQL (si pas deja en cours ou mise a jour port nécessaire)
Write-Host "Demarrage de PostgreSQL..." -ForegroundColor Yellow

# On supprime toujours le conteneur pour s'assurer que le port mapping est appliqué (les données sont dans le volume)
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker rm -f mabibliotheque-postgres 2>/dev/null"

# Creer le volume pour les donnees PostgreSQL (idempotent)
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker volume create mabibliotheque_pgdata 2>/dev/null"

# Lancer PostgreSQL sur le port 5433
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name mabibliotheque-postgres -p 5433:5432 --network ${NETWORK_NAME} --restart unless-stopped -v mabibliotheque_pgdata:/var/lib/postgresql/data -e POSTGRES_DB=bibliotheque -e POSTGRES_USER=${POSTGRES_USER} -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} postgres:16-alpine"

# Attendre que PostgreSQL soit pret
Write-Host "  Attente de PostgreSQL..." -ForegroundColor Gray
$maxAttempts = 30
$attempts = 0
while ($attempts -lt $maxAttempts) {
    Start-Sleep -Seconds 2
    $pgReady = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker exec mabibliotheque-postgres pg_isready -U ${POSTGRES_USER} 2>/dev/null && echo 'ready'"
    if ($pgReady -match 'ready') {
        Write-Host "  PostgreSQL est pret !" -ForegroundColor Green
        break
    }
    $attempts++
    Write-Host "  ." -NoNewline -ForegroundColor Gray
}
if ($attempts -ge $maxAttempts) {
    Write-Host ""
    Write-Host "  Timeout: PostgreSQL n'a pas demarre" -ForegroundColor Red
    exit 1
}

# Telecharger et demarrer le backend
Write-Host "Telechargement de la nouvelle image backend..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker pull llcelmarll/mabibliotheque-backend:latest"

Write-Host "Demarrage du backend..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name mabibliotheque-backend --network ${NETWORK_NAME} --restart unless-stopped -v ${SYNOLOGY_PATH}/data:/app/data --env-file ${SYNOLOGY_PATH}/.env llcelmarll/mabibliotheque-backend:latest"

# Demarrer le frontend
Write-Host "Demarrage du frontend..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker pull llcelmarll/mabibliotheque-frontend:latest"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name mabibliotheque-frontend --network ${NETWORK_NAME} --restart unless-stopped -p 8080:80 -v /volume1/docker/mabibliotheque/apk:/app/apk:ro llcelmarll/mabibliotheque-frontend:latest"

# Afficher le statut
Write-Host ""
Write-Host "Conteneurs deployes:" -ForegroundColor Green
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker ps --filter name=mabibliotheque --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

Write-Host ""
Write-Host "Deploiement termine !" -ForegroundColor Green
Write-Host "Acces: http://${SYNOLOGY_IP}:8080" -ForegroundColor Cyan
Write-Host "Documentation: http://${SYNOLOGY_IP}:8080/api/docs" -ForegroundColor Cyan
