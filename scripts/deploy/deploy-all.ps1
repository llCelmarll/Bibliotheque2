# Script de deploiement complet
# Met a jour le backend, le frontend web, l'app mobile ET l'APK Android

param(
    [switch]$SkipBackend,
    [switch]$SkipWeb,
    [switch]$SkipMobile,
    [switch]$SkipApk,
    [string]$UpdateMessage
)

# Fonction pour vérifier et lancer Docker Desktop si nécessaire
function Start-DockerIfNeeded {
    Write-Host "Vérification de Docker Desktop..." -ForegroundColor Gray

    # Vérifier si Docker est en cours d'exécution
    try {
        $null = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Docker Desktop est déjà en cours d'exécution" -ForegroundColor Green
            return $true
        }
    } catch {
        # Docker n'est pas accessible
    }

    Write-Host "  Docker Desktop n'est pas en cours d'exécution" -ForegroundColor Yellow
    Write-Host "  Lancement de Docker Desktop..." -ForegroundColor Yellow

    # Chemins possibles pour Docker Desktop
    $dockerPaths = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    )

    $dockerExe = $null
    foreach ($path in $dockerPaths) {
        if (Test-Path $path) {
            $dockerExe = $path
            break
        }
    }

    if (-not $dockerExe) {
        Write-Host "  Erreur: Docker Desktop n'a pas été trouvé" -ForegroundColor Red
        Write-Host "  Veuillez lancer Docker Desktop manuellement" -ForegroundColor Red
        return $false
    }

    # Lancer Docker Desktop
    Start-Process -FilePath $dockerExe

    Write-Host "  Attente du démarrage de Docker Desktop..." -ForegroundColor Yellow
    $maxAttempts = 60  # 60 secondes max
    $attempts = 0

    while ($attempts -lt $maxAttempts) {
        Start-Sleep -Seconds 2
        try {
            $null = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Docker Desktop est maintenant prêt !" -ForegroundColor Green
                return $true
            }
        } catch {
            # Continuer à attendre
        }
        $attempts++
        Write-Host "  ." -NoNewline -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "  Timeout: Docker Desktop n'a pas démarré dans les temps" -ForegroundColor Red
    return $false
}

Write-Host "`nDeploiement complet de l'application" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Demander le message de déploiement si non fourni
if (-not $UpdateMessage) {
    Write-Host ""
    Write-Host "Message de deploiement requis !" -ForegroundColor Yellow
    $UpdateMessage = Read-Host "Entrez le message de deploiement"
    
    if (-not $UpdateMessage -or $UpdateMessage.Trim() -eq "") {
        Write-Host "Erreur: Le message de deploiement ne peut pas etre vide" -ForegroundColor Red
        exit 1
    }
}


Write-Host "Parametres de deploiement :" -ForegroundColor Cyan
Write-Host "Update Message pour l'app mobile OTA: $UpdateMessage" -ForegroundColor Cyan
Write-Host ""
if ($SkipBackend) { Write-Host "  - Backend: SAUTE" -ForegroundColor Yellow } else { Write-Host "  - Backend: OK" -ForegroundColor Green }
if ($SkipWeb) { Write-Host "  - Frontend Web: SAUTE" -ForegroundColor Yellow } else { Write-Host "  - Frontend Web: OK" -ForegroundColor Green }
if ($SkipMobile) { Write-Host "  - App Mobile: SAUTE" -ForegroundColor Yellow } else { Write-Host "  - App Mobile: OK" -ForegroundColor Green }
if ($SkipApk) { Write-Host "  - APK Android: SAUTE" -ForegroundColor Yellow } else { Write-Host "  - APK Android: OK" -ForegroundColor Green }
Write-Host ""

Write-Host "Note : La runtimeVersion est fixée à '1.0.0' dans app.json. Les mises à jour OTA JS ne nécessitent plus d'incrémenter la version ou le versionCode." -ForegroundColor Cyan
Write-Host "Si tu rebuilds l'app native avec une nouvelle runtimeVersion, incrémente-la aussi dans app.json." -ForegroundColor Cyan

# Backup de la base de donnees si elle existe
Write-Host "Backup de la base de donnees..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" 'if [ -f ${SYNOLOGY_PATH}/data/bibliotheque.db ] && [ -s ${SYNOLOGY_PATH}/data/bibliotheque.db ]; then cp ${SYNOLOGY_PATH}/data/bibliotheque.db ${SYNOLOGY_PATH}/backups/bibliotheque_$(date +%Y-%m-%d_%H-%M-%S).db; echo "Backup cree"; else echo "Pas de backup (DB vide ou inexistante)"; fi'
# 1. Build et push de l'image Docker backend
if (-not $SkipBackend) {
    Write-Host "[1/4] Build et deploiement du backend..." -ForegroundColor Yellow
    Write-Host ""

    # Vérifier que Docker est lancé
    if (-not (Start-DockerIfNeeded)) {
        Write-Host "Impossible de continuer sans Docker Desktop" -ForegroundColor Red
        exit 1
    }

    Set-Location backend

    # Build multi-architecture
    Write-Host "  Build de l'image Docker (AMD64 + ARM64)..." -ForegroundColor Gray
    docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile -t llcelmarll/mabibliotheque-backend:latest --push .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors du build Docker du backend" -ForegroundColor Red
        exit 1
    }
    
    Set-Location ..
    
    # Redeploy sur le NAS
    Write-Host ""
    Write-Host "  Redeploy sur le NAS..." -ForegroundColor Gray
    & "$PSScriptRoot\redeploy-backend.ps1"

    # Attendre que le conteneur soit prêt
    Write-Host "  Attente du démarrage du conteneur..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
    
    # Vérification que les migrations se sont bien déroulées
    Write-Host ""
    Write-Host "  Vérification des migrations..." -ForegroundColor Gray
    $migrationCheck = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "docker logs mabibliotheque-backend 2>&1 | grep -E '(Migrations appliquées|alembic_version)'"
    
    if ($migrationCheck) {
        Write-Host "  Migrations détectées dans les logs :" -ForegroundColor Green
        Write-Host "  $migrationCheck" -ForegroundColor Gray
    } else {
        Write-Host "  Aucune confirmation de migration trouvée dans les logs" -ForegroundColor Yellow
        Write-Host "  Vérifiez les logs complets avec: docker logs mabibliotheque-backend" -ForegroundColor Yellow
    }
    
    
    Write-Host ""
    Write-Host "  Backend deploye !" -ForegroundColor Green
    Write-Host "  API URL: https://mabibliotheque.ovh/api" -ForegroundColor Gray
    Write-Host ""
}

# 2. Publication OTA pour l'app mobile
if (-not $SkipMobile) {
    Write-Host "[2/4] Mise a jour OTA de l'app mobile..." -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location frontend
    
    $env:EXPO_PUBLIC_API_URL = "https://mabibliotheque.ovh/api"
    eas update --branch production --message $UpdateMessage
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors de la publication OTA" -ForegroundColor Red
        exit 1
    }
    
    Set-Location ..
    
    Write-Host ""
    Write-Host "  App mobile mise a jour !" -ForegroundColor Green
    Write-Host ""
}

if (-not $SkipApk) {
    Write-Host "[APK] Récupération et injection du lien APK Android..." -ForegroundColor Yellow
    Write-Host ""
    # Récupération du lien du dernier build APK EAS
    Set-Location frontend
    $apkJson = eas build:list --platform android --profile preview --limit 1 --json --non-interactive
    if ($LASTEXITCODE -ne 0 -or !$apkJson) {
        Write-Host "  Erreur lors de la récupération du build APK" -ForegroundColor Red
        exit 1
    }
    $apkUrl = ($apkJson | ConvertFrom-Json).artifacts.buildUrl
    Set-Location ..
    Write-Host "  Lien APK récupéré: $apkUrl" -ForegroundColor Green

    # Mise à jour de nginx-frontend.conf avec le nouveau lien APK
    Write-Host "Mise à jour de nginx-frontend.conf avec le nouveau lien APK..." -ForegroundColor Yellow
    $nginxConfPath = "frontend\\nginx-frontend.conf"
    # Remplace toute la ligne de redirection APK par la nouvelle URL
    (gc $nginxConfPath) -replace 'return 302 https://expo\.dev/artifacts/eas/.*\.apk;', "return 302 $apkUrl;" | Set-Content $nginxConfPath
    Write-Host "  nginx-frontend.conf mis à jour !" -ForegroundColor Green

    # Vérification de la mise à jour de l'adresse APK dans nginx-frontend.conf
    $nginxContent = Get-Content $nginxConfPath
    $apkLine = $nginxContent | Select-String -Pattern $apkUrl
    if ($apkLine) {
        Write-Host "  Vérification OK : L'adresse APK est bien présente dans nginx-frontend.conf" -ForegroundColor Green
    } else {
        Write-Host "  Vérification ECHEC : L'adresse APK n'a pas été trouvée dans nginx-frontend.conf" -ForegroundColor Red
    }

    Write-Host "  APK accessible via: https://mabibliotheque.ovh/bibliotheque.apk" -ForegroundColor Green
    Write-Host ""
}

# 4. Build et push de l'image Docker frontend (Web)
if (-not $SkipWeb) {
    Write-Host "[4/4] Build et deploiement du frontend Web..." -ForegroundColor Yellow
    Write-Host ""

    # Vérifier que Docker est lancé
    if (-not (Start-DockerIfNeeded)) {
        Write-Host "Impossible de continuer sans Docker Desktop" -ForegroundColor Red
        exit 1
    }

    Set-Location frontend

    # Build multi-architecture
    Write-Host "  Build de l'image Docker (AMD64 + ARM64)..." -ForegroundColor Gray
    docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile.prod -t llcelmarll/mabibliotheque-frontend:latest --push .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors du build Docker" -ForegroundColor Red
        exit 1
    }
    
    Set-Location ..
    
    # Redeploy sur le NAS
    Write-Host ""
    Write-Host "  Redeploy sur le NAS..." -ForegroundColor Gray
    & "$PSScriptRoot\redeploy-frontend.ps1"
    
    Write-Host ""
    Write-Host "  Frontend Web deploye !" -ForegroundColor Green
    Write-Host "  URL: https://mabibliotheque.ovh" -ForegroundColor Gray
    Write-Host ""
}

# 5. Résumé
Write-Host "[5/5] Resume du deploiement" -ForegroundColor Yellow
Write-Host ""
if (-not $SkipBackend) {
    Write-Host "  Backend API: https://mabibliotheque.ovh/api" -ForegroundColor Green
}
if (-not $SkipWeb) {
    Write-Host "  Frontend Web: https://mabibliotheque.ovh" -ForegroundColor Green
}
if (-not $SkipMobile) {
    Write-Host "  App Mobile: Mise a jour OTA publiee (branch: preview)" -ForegroundColor Green
}
if (-not $SkipApk) {
    Write-Host "  APK Android: https://mabibliotheque.ovh/bibliotheque.apk" -ForegroundColor Green
}
Write-Host ""
Write-Host "Deploiement termine !" -ForegroundColor Cyan
Write-Host ""



