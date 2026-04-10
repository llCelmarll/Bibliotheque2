# Redeploiement du frontend STAGING uniquement
# Pull la nouvelle image :staging et relance le conteneur sur le port 8090.

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

$NETWORK_NAME   = "mabibliotheque_staging_network"
$CONTAINER_NAME = "mabibliotheque-staging-frontend"
$FRONTEND_PORT  = "8090"

Write-Host "`nRedeploy Frontend STAGING" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host "Serveur:   $SYNOLOGY_IP" -ForegroundColor Gray
Write-Host "Container: $CONTAINER_NAME" -ForegroundColor Gray
Write-Host "Port:      $FRONTEND_PORT" -ForegroundColor Gray
Write-Host ""

# Stop et suppression de l'ancien conteneur
Write-Host "Arret de l'ancien conteneur..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker stop ${CONTAINER_NAME} 2>/dev/null; sudo /usr/local/bin/docker rm ${CONTAINER_NAME} 2>/dev/null"

# Pull de la nouvelle image
Write-Host "Pull de la nouvelle image :staging..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker pull llcelmarll/mabibliotheque-frontend:staging"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du pull de l'image :staging" -ForegroundColor Red
    exit 1
}

# Demarrage du nouveau conteneur
Write-Host "Demarrage du conteneur staging..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker network create ${NETWORK_NAME} 2>/dev/null || true"
$STAGING_PATH = "/volume1/docker/mabibliotheque-staging"
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name ${CONTAINER_NAME} --network ${NETWORK_NAME} --restart unless-stopped -p ${FRONTEND_PORT}:80 -v ${STAGING_PATH}/apk:/app/apk:ro llcelmarll/mabibliotheque-frontend:staging"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du demarrage du conteneur" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Frontend staging redeploye !" -ForegroundColor Green
Write-Host "Accessible sur: http://${SYNOLOGY_IP}:${FRONTEND_PORT}" -ForegroundColor Gray
Write-Host ""
