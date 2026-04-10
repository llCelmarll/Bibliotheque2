# Redeploiement du backend STAGING uniquement
# Pull la nouvelle image :staging et relance le conteneur.
# Le conteneur PostgreSQL staging n'est PAS touche (il persiste).

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

$STAGING_PATH   = "/volume1/docker/mabibliotheque-staging"
$NETWORK_NAME   = "mabibliotheque_staging_network"
$CONTAINER_NAME = "mabibliotheque-staging-backend"
$PG_CONTAINER   = "mabibliotheque-staging-postgres"

Write-Host "`nRedeploiement backend STAGING" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Serveur:    $SYNOLOGY_IP" -ForegroundColor Gray
Write-Host "Container:  $CONTAINER_NAME" -ForegroundColor Gray
Write-Host ""

# Upload du .env staging
$stagingEnvFile = Join-Path $PSScriptRoot "..\..\..\\.env.staging"
if (Test-Path $stagingEnvFile) {
    Write-Host "Mise a jour du .env staging sur le NAS..." -ForegroundColor Yellow
    Get-Content $stagingEnvFile -Raw | ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "cat > ${STAGING_PATH}/.env"
    Write-Host "  .env staging mis a jour" -ForegroundColor Green
    Write-Host ""
}

# [0/4] Backup PostgreSQL staging
Write-Host "[0/4] Backup de la base staging..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "mkdir -p ${STAGING_PATH}/backups && if sudo /usr/local/bin/docker ps --filter name=${PG_CONTAINER} --format '{{.Names}}' | grep -q ${PG_CONTAINER}; then sudo /usr/local/bin/docker exec ${PG_CONTAINER} pg_dump -U bibliotheque_staging bibliotheque_staging > ${STAGING_PATH}/backups/staging_`$(date +%Y%m%d_%H%M%S).sql && echo '  Backup staging cree'; else echo '  PostgreSQL staging non demarre (premier deploiement ?)'; fi"
Write-Host ""

# [1/4] Arret et suppression du container existant
Write-Host "[1/4] Arret du backend staging..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker stop ${CONTAINER_NAME} 2>/dev/null; sudo /usr/local/bin/docker rm ${CONTAINER_NAME} 2>/dev/null"

# [2/4] Pull de la nouvelle image
Write-Host "[2/4] Pull de l'image :staging..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker pull llcelmarll/mabibliotheque-backend:staging"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du pull de l'image :staging" -ForegroundColor Red
    exit 1
}

# [3/4] Verification
Write-Host "[3/4] Verification de la configuration..." -ForegroundColor Yellow
$envCheck = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "grep -c 'DATABASE_URL=postgresql' ${STAGING_PATH}/.env 2>/dev/null"
if ([int]$envCheck -lt 1) {
    Write-Host "ATTENTION: DATABASE_URL PostgreSQL manquant dans .env staging !" -ForegroundColor Red
    Write-Host "   Verifiez que ${STAGING_PATH}/.env contient DATABASE_URL=postgresql://..." -ForegroundColor Yellow
    $response = Read-Host "Continuer quand meme ? (y/N)"
    if ($response -ne 'y') { exit 1 }
}

$pgRunning = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker ps --filter name=${PG_CONTAINER} --format '{{.Names}}' 2>/dev/null"
if (-not $pgRunning) {
    Write-Host "ATTENTION: PostgreSQL staging n'est pas en cours d'execution !" -ForegroundColor Red
    Write-Host "Lancez d'abord: .\deploy-staging.ps1" -ForegroundColor Yellow
    exit 1
}

# [4/4] Redemarrage du container
Write-Host ""
Write-Host "[4/4] Demarrage du backend staging..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker network create ${NETWORK_NAME} 2>/dev/null || true"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name ${CONTAINER_NAME} --network ${NETWORK_NAME} --restart unless-stopped -v ${STAGING_PATH}/data:/app/data --env-file ${STAGING_PATH}/.env llcelmarll/mabibliotheque-backend:staging"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du demarrage du container" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Backend staging redeploye !" -ForegroundColor Green
Write-Host "API: http://${SYNOLOGY_IP}:8090/api" -ForegroundColor Gray
Write-Host ""

# Verification de la sante du container
Write-Host "Verification de la sante du container..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

$logs = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker logs ${CONTAINER_NAME} 2>&1 | tail -50"
Write-Host $logs -ForegroundColor Gray

Write-Host ""
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker ps --filter name=${CONTAINER_NAME} --format 'Status: {{.Status}}'"

Write-Host ""
Write-Host "Termine !" -ForegroundColor Cyan
