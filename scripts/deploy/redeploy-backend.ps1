# Script de redeploiement du backend uniquement
# Redemarre le container backend sur le NAS Synology avec la derniere image
# Note: Le conteneur PostgreSQL n'est PAS touche (il persiste)

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

$CONTAINER_NAME = "mabibliotheque-backend"

Write-Host "`nRedeploiement du backend..." -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Serveur: $SYNOLOGY_IP" -ForegroundColor Gray
Write-Host "Container: $CONTAINER_NAME" -ForegroundColor Gray
Write-Host "Chemin NAS: $SYNOLOGY_PATH" -ForegroundColor Gray
Write-Host ""

# 0. Backup PostgreSQL AVANT tout
Write-Host "[0/4] Backup de la base de donnees PostgreSQL..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "mkdir -p ${SYNOLOGY_PATH}/backups && sudo /usr/local/bin/docker exec mabibliotheque-postgres pg_dump -U bibliotheque bibliotheque > ${SYNOLOGY_PATH}/backups/bibliotheque_`$(date +%Y%m%d_%H%M%S).sql && echo 'Backup PostgreSQL cree' || echo 'Erreur backup'"

Write-Host ""

# 1. Arret et suppression du container existant
Write-Host "[1/4] Arret et suppression du container existant..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker stop $CONTAINER_NAME 2>/dev/null; sudo /usr/local/bin/docker rm $CONTAINER_NAME 2>/dev/null"

# 2. Pull de la derniere image
Write-Host "[2/4] Pull de la derniere image Docker..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker pull llcelmarll/mabibliotheque-backend:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du pull de l'image" -ForegroundColor Red
    exit 1
}

# 3. Verification des variables d'environnement critiques
Write-Host ""
Write-Host "[3/4] Verification de la configuration..." -ForegroundColor Yellow
$envCheck = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "grep -c 'DATABASE_URL=postgresql' ${SYNOLOGY_PATH}/.env 2>/dev/null"
if ([int]$envCheck -lt 1) {
    Write-Host "ATTENTION: DATABASE_URL PostgreSQL manquant dans .env sur le NAS !" -ForegroundColor Red
    Write-Host "   Verifiez que ${SYNOLOGY_PATH}/.env contient:" -ForegroundColor Yellow
    Write-Host "   - DATABASE_URL=postgresql://..." -ForegroundColor Gray
    Write-Host ""
    $response = Read-Host "Continuer quand meme ? (y/N)"
    if ($response -ne 'y') {
        exit 1
    }
}

# Verifier que PostgreSQL tourne
$pgRunning = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker ps --filter name=mabibliotheque-postgres --format '{{.Names}}' 2>/dev/null"
if (-not $pgRunning) {
    Write-Host "ATTENTION: Le conteneur PostgreSQL n'est pas en cours d'execution !" -ForegroundColor Red
    Write-Host "Lancez d'abord: .\deploy-synology.ps1" -ForegroundColor Yellow
    exit 1
}

# 4. Redemarrage du container
Write-Host ""
Write-Host "[4/4] Redemarrage du container..." -ForegroundColor Yellow
# S'assurer que le réseau existe
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker network create mabibliotheque_network 2>/dev/null || true"

ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker run -d --name $CONTAINER_NAME --network mabibliotheque_network --restart unless-stopped -v ${SYNOLOGY_PATH}/data:/app/data --env-file ${SYNOLOGY_PATH}/.env llcelmarll/mabibliotheque-backend:latest"

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
Start-Sleep -Seconds 10

# Verifier les logs pour les migrations
$logs = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker logs $CONTAINER_NAME 2>&1 | tail -5"
Write-Host $logs -ForegroundColor Gray

Write-Host ""
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker ps --filter name=$CONTAINER_NAME --format 'Status: {{.Status}}'"

Write-Host ""
Write-Host "Termine !" -ForegroundColor Cyan
