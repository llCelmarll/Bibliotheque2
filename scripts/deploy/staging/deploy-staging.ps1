# Setup initial de l'environnement de staging sur le NAS Synology
# A lancer UNE SEULE FOIS pour creer tous les conteneurs et volumes staging.
# Pour les redéploiements suivants, utilisez deploy-all-staging.ps1

# Chargement des variables de deploiement
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

# Constantes staging
$STAGING_PATH    = "/volume1/docker/mabibliotheque-staging"
$NETWORK_NAME    = "mabibliotheque_staging_network"
$PG_CONTAINER    = "mabibliotheque-staging-postgres"
$BACKEND_CONT    = "mabibliotheque-staging-backend"
$FRONTEND_CONT   = "mabibliotheque-staging-frontend"
$PG_VOLUME       = "mabibliotheque_staging_pgdata"
$PG_HOST_PORT    = "5434"
$FRONTEND_PORT   = "8090"

# Lecture des credentials PostgreSQL depuis .env.staging
$stagingEnvFile = Join-Path $PSScriptRoot "..\..\..\\.env.staging"
$POSTGRES_PASSWORD = ""
$POSTGRES_USER     = "bibliotheque_staging"
if (Test-Path $stagingEnvFile) {
    Get-Content $stagingEnvFile | ForEach-Object {
        if ($_ -match '^\s*POSTGRES_PASSWORD=(.*)$') { $POSTGRES_PASSWORD = $Matches[1].Trim() }
        if ($_ -match '^\s*POSTGRES_USER=(.*)$')     { $POSTGRES_USER     = $Matches[1].Trim() }
    }
} else {
    Write-Host "Erreur: .env.staging introuvable !" -ForegroundColor Red
    Write-Host "Copiez .env.staging.example vers .env.staging et remplissez les valeurs." -ForegroundColor Yellow
    exit 1
}

Write-Host "`nSetup Staging sur Synology NAS" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "Chemin NAS:  $STAGING_PATH" -ForegroundColor Gray
Write-Host "Serveur:     $SYNOLOGY_IP" -ForegroundColor Gray
Write-Host "Frontend:    http://${SYNOLOGY_IP}:${FRONTEND_PORT}" -ForegroundColor Gray
Write-Host "API:         http://${SYNOLOGY_IP}:${FRONTEND_PORT}/api/docs" -ForegroundColor Gray
Write-Host ""

# [1] Creer les repertoires
Write-Host "[1/6] Creation des repertoires sur le NAS..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "mkdir -p ${STAGING_PATH}/data ${STAGING_PATH}/backups ${STAGING_PATH}/apk"
Write-Host "  Repertoires crees" -ForegroundColor Green

# [2] Upload du .env staging
Write-Host "[2/6] Upload du .env staging..." -ForegroundColor Yellow
Get-Content $stagingEnvFile -Raw | ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "cat > ${STAGING_PATH}/.env"
Write-Host "  .env staging uploade" -ForegroundColor Green

# [3] Creer le reseau staging
Write-Host "[3/6] Creation du reseau staging..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker network create ${NETWORK_NAME} 2>/dev/null && echo '  Reseau cree' || echo '  Reseau existe deja'"

# [4] PostgreSQL staging
Write-Host "[4/6] Demarrage de PostgreSQL staging (port $PG_HOST_PORT)..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker rm -f ${PG_CONTAINER} 2>/dev/null || true"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker volume create ${PG_VOLUME} 2>/dev/null || true"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name ${PG_CONTAINER} -p ${PG_HOST_PORT}:5432 --network ${NETWORK_NAME} --restart unless-stopped -v ${PG_VOLUME}:/var/lib/postgresql/data -e POSTGRES_DB=bibliotheque_staging -e POSTGRES_USER=${POSTGRES_USER} -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} postgres:16-alpine"

# Attendre que PostgreSQL soit pret
Write-Host "  Attente de PostgreSQL staging..." -ForegroundColor Gray
$maxAttempts = 30
$attempts = 0
while ($attempts -lt $maxAttempts) {
    Start-Sleep -Seconds 2
    $pgReady = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker exec ${PG_CONTAINER} pg_isready -U ${POSTGRES_USER} 2>/dev/null && echo 'ready'"
    if ($pgReady -match 'ready') {
        Write-Host "  PostgreSQL staging pret !" -ForegroundColor Green
        break
    }
    $attempts++
    Write-Host "  ." -NoNewline -ForegroundColor Gray
}
if ($attempts -ge $maxAttempts) {
    Write-Host ""
    Write-Host "  Timeout: PostgreSQL staging n'a pas demarre" -ForegroundColor Red
    exit 1
}

# [5] Backend staging
Write-Host "[5/6] Demarrage du backend staging..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker rm -f ${BACKEND_CONT} 2>/dev/null || true"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker pull llcelmarll/mabibliotheque-backend:staging"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name ${BACKEND_CONT} --network ${NETWORK_NAME} --restart unless-stopped -v ${STAGING_PATH}/data:/app/data --env-file ${STAGING_PATH}/.env llcelmarll/mabibliotheque-backend:staging"
Write-Host "  Backend staging demarre" -ForegroundColor Green

# [6] Frontend staging
Write-Host "[6/6] Demarrage du frontend staging (port $FRONTEND_PORT)..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker rm -f ${FRONTEND_CONT} 2>/dev/null || true"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker pull llcelmarll/mabibliotheque-frontend:staging"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name ${FRONTEND_CONT} --network ${NETWORK_NAME} --restart unless-stopped -p ${FRONTEND_PORT}:80 -v ${STAGING_PATH}/apk:/app/apk:ro llcelmarll/mabibliotheque-frontend:staging"
Write-Host "  Frontend staging demarre" -ForegroundColor Green

# Resume
Write-Host ""
Write-Host "Conteneurs staging deployes:" -ForegroundColor Green
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker ps --filter name=mabibliotheque-staging --format 'table {{.Names}}`t{{.Status}}`t{{.Ports}}'"
Write-Host ""
Write-Host "Setup staging termine !" -ForegroundColor Cyan
Write-Host "Frontend: http://${SYNOLOGY_IP}:${FRONTEND_PORT}" -ForegroundColor Cyan
Write-Host "API docs: http://${SYNOLOGY_IP}:${FRONTEND_PORT}/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour les prochains deploiements : .\deploy-all-staging.ps1" -ForegroundColor Gray
