# Redeploiement du frontend admin PRODUCTION uniquement
# Pull la nouvelle image :latest et relance le conteneur sur le port 8082.

$envFile = Join-Path $PSScriptRoot "..\..\\.env.deploy"
if (-not (Test-Path $envFile)) {
    $envFile = Join-Path $PSScriptRoot ".env.deploy"
}
if (-not (Test-Path $envFile)) {
    Write-Host "Erreur: fichier .env.deploy introuvable" -ForegroundColor Red
    exit 1
}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        Set-Variable -Name $Matches[1].Trim() -Value $Matches[2].Trim()
        [Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), "Process")
    }
}

$NETWORK_NAME   = "mabibliotheque_network"
$CONTAINER_NAME = "mabibliotheque-admin"
$ADMIN_PORT     = "8082"

Write-Host "`nRedeploy Admin PRODUCTION" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host "Serveur:   $SYNOLOGY_IP" -ForegroundColor Gray
Write-Host "Container: $CONTAINER_NAME" -ForegroundColor Gray
Write-Host "Port:      $ADMIN_PORT" -ForegroundColor Gray
Write-Host ""

Write-Host "Arret de l'ancien conteneur..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker stop ${CONTAINER_NAME} 2>/dev/null; sudo /usr/local/bin/docker rm ${CONTAINER_NAME} 2>/dev/null"

Write-Host "Pull de la nouvelle image..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker pull llcelmarll/mabibliotheque-admin:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du pull de l'image" -ForegroundColor Red
    exit 1
}

Write-Host "Demarrage du conteneur admin prod..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name ${CONTAINER_NAME} --network ${NETWORK_NAME} --restart unless-stopped -p ${ADMIN_PORT}:80 llcelmarll/mabibliotheque-admin:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du demarrage du conteneur" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Admin prod redeploye !" -ForegroundColor Green
Write-Host "Accessible sur: https://admin.mabibliotheque.ovh/admin" -ForegroundColor Gray
Write-Host ""
