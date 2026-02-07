# Script de deploiement pour Synology NAS (avec PostgreSQL)

# Chargement des variables de deploiement
$envFile = Join-Path $PSScriptRoot "..\..\.env.deploy"
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

# Demarrer PostgreSQL (si pas deja en cours)
Write-Host "Demarrage de PostgreSQL..." -ForegroundColor Yellow
$pgRunning = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker ps --filter name=mabibliotheque-postgres --format '{{.Names}}' 2>/dev/null"
if (-not $pgRunning) {
    # Supprimer le conteneur arrete s'il existe
    ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker rm mabibliotheque-postgres 2>/dev/null"

    # Creer le volume pour les donnees PostgreSQL
    ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker volume create mabibliotheque_pgdata 2>/dev/null"

    # Lancer PostgreSQL
    ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name mabibliotheque-postgres --network ${NETWORK_NAME} --restart unless-stopped -v mabibliotheque_pgdata:/var/lib/postgresql/data -e POSTGRES_DB=bibliotheque -e POSTGRES_USER=${POSTGRES_USER} -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} postgres:16-alpine"

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
} else {
    Write-Host "  PostgreSQL est deja en cours d'execution" -ForegroundColor Green
    # S'assurer qu'il est sur le bon reseau
    ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker network connect ${NETWORK_NAME} mabibliotheque-postgres 2>/dev/null"
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
