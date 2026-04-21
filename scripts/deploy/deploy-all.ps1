# Script de deploiement complet avec auto-detection des changements
# Compare avec la branche prod (dernier etat deploye) pour savoir quoi deployer

param(
    # Forcer le deploiement d'un composant meme sans changement detecte
    [switch]$ForceBackend,
    [switch]$ForceWeb,
    [switch]$ForceMobile,
    [switch]$ForceApk,

    # Message OTA optionnel (defaut = dernier message de commit)
    [string]$UpdateMessage,

    # APK-specific
    [switch]$SkipBuild,         # Sauter le build EAS, utiliser le dernier artefact
    [ValidateSet("patch", "minor", "major")]
    [string]$BumpType = "patch",

    # Mode simulation : affiche le plan sans executer
    [switch]$DryRun
)

# ---------------------------------------------------------------------------
# FONCTIONS HELPER
# ---------------------------------------------------------------------------

function Start-DockerIfNeeded {
    Write-Host "Verification de Docker Desktop..." -ForegroundColor Gray

    try {
        $null = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Docker Desktop est deja en cours d'execution" -ForegroundColor Green
            return $true
        }
    } catch {}

    Write-Host "  Docker Desktop n'est pas en cours d'execution" -ForegroundColor Yellow
    Write-Host "  Lancement de Docker Desktop..." -ForegroundColor Yellow

    $dockerPaths = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    )

    $dockerExe = $null
    foreach ($path in $dockerPaths) {
        if (Test-Path $path) { $dockerExe = $path; break }
    }

    if (-not $dockerExe) {
        Write-Host "  Erreur: Docker Desktop n'a pas ete trouve" -ForegroundColor Red
        Write-Host "  Veuillez lancer Docker Desktop manuellement" -ForegroundColor Red
        return $false
    }

    Start-Process -FilePath $dockerExe
    Write-Host "  Attente du demarrage de Docker Desktop..." -ForegroundColor Yellow
    $maxAttempts = 60
    $attempts = 0

    while ($attempts -lt $maxAttempts) {
        Start-Sleep -Seconds 2
        try {
            $null = docker info 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  Docker Desktop est maintenant pret !" -ForegroundColor Green
                return $true
            }
        } catch {}
        $attempts++
        Write-Host "  ." -NoNewline -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "  Timeout: Docker Desktop n'a pas demarre dans les temps" -ForegroundColor Red
    return $false
}

function Get-DefaultUpdateMessage {
    $msg = git log --format="%s" -1 HEAD 2>$null
    if ($msg) { return $msg.Trim() }
    return "Mise a jour"
}

function Get-DeploymentPlan {
    param(
        [switch]$ForceBackend,
        [switch]$ForceWeb,
        [switch]$ForceMobile,
        [switch]$ForceApk
    )

    $plan = @{
        Backend      = $false
        Web          = $false
        Mobile       = $false
        Apk          = $false
        ChangedFiles = @()
        IsFirstDeploy = $false
    }

    # Verifier si la branche prod existe
    $null = git rev-parse --verify prod 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Aucune branche prod detectee — premier deploiement, tout sera deploye" -ForegroundColor Yellow
        $plan.Backend      = $true
        $plan.Web          = $true
        $plan.Mobile       = $true
        $plan.Apk          = $true
        $plan.IsFirstDeploy = $true
        return $plan
    }

    # Verifier que prod n'est pas en avance sur main (ne devrait plus arriver
    # depuis que Update-ProdBranch commite sur main puis fast-forward prod)
    $aheadCount = git rev-list --count main..prod 2>$null
    if ($aheadCount -and [int]$aheadCount -gt 0) {
        Write-Host "ATTENTION: prod contient $aheadCount commit(s) absents de main." -ForegroundColor Yellow
        Write-Host "Mergeez prod dans main manuellement avant de continuer." -ForegroundColor Yellow
        exit 1
    }

    # Recuperer les fichiers modifies depuis le dernier deploiement
    $changedFiles = @(git diff --name-only prod HEAD 2>$null)
    $plan.ChangedFiles = $changedFiles

    # Regles de detection
    $backendChanged = $changedFiles | Where-Object { $_ -match '^backend/' }
    $frontendChanged = $changedFiles | Where-Object { $_ -match '^frontend/' }
    $nativeChanged = $changedFiles | Where-Object {
        $_ -match '^frontend/android/' -or
        $_ -match '^frontend/ios/' -or
        $_ -eq 'frontend/app.config.js' -or
        $_ -eq 'frontend/package.json'
    }

    $plan.Backend = ($backendChanged.Count -gt 0) -or $ForceBackend.IsPresent
    $plan.Web     = ($frontendChanged.Count -gt 0) -or $ForceWeb.IsPresent
    $plan.Mobile  = ($frontendChanged.Count -gt 0) -or $ForceMobile.IsPresent
    $plan.Apk     = ($nativeChanged.Count -gt 0) -or $ForceApk.IsPresent

    return $plan
}

function Show-DeploymentSummary {
    param($Plan, $UpdateMessage)

    $changedFiles = $Plan.ChangedFiles
    $backendFiles = @($changedFiles | Where-Object { $_ -match '^backend/' })
    $frontendFiles = @($changedFiles | Where-Object { $_ -match '^frontend/' })
    $nativeFiles = @($changedFiles | Where-Object {
        $_ -match '^frontend/android/' -or $_ -match '^frontend/ios/' -or
        $_ -eq 'frontend/app.config.js' -or $_ -eq 'frontend/package.json'
    })

    Write-Host ""
    Write-Host "Analyse des changements depuis prod..." -ForegroundColor Cyan
    Write-Host ""

    $col1 = 14
    $col2 = 12

    # Backend
    if ($Plan.Backend) {
        $label = "[DEPLOYE]".PadRight($col2)
        $detail = if ($backendFiles.Count -gt 0) { "backend/ ($($backendFiles.Count) fichier(s))" } else { "force (-ForceBackend)" }
        Write-Host ("  BACKEND".PadRight($col1) + $label + $detail) -ForegroundColor Green
    } else {
        Write-Host ("  BACKEND".PadRight($col1) + "[IGNORE] ".PadRight($col2) + "aucun changement detecte") -ForegroundColor DarkGray
    }

    # Web
    if ($Plan.Web) {
        $label = "[DEPLOYE]".PadRight($col2)
        $detail = if ($frontendFiles.Count -gt 0) { "frontend/ ($($frontendFiles.Count) fichier(s))" } else { "force (-ForceWeb)" }
        Write-Host ("  WEB".PadRight($col1) + $label + $detail) -ForegroundColor Green
    } else {
        Write-Host ("  WEB".PadRight($col1) + "[IGNORE] ".PadRight($col2) + "aucun changement detecte") -ForegroundColor DarkGray
    }

    # Mobile OTA
    if ($Plan.Mobile) {
        $label = "[DEPLOYE]".PadRight($col2)
        $detail = if ($frontendFiles.Count -gt 0) { "frontend/ ($($frontendFiles.Count) fichier(s))" } else { "force (-ForceMobile)" }
        Write-Host ("  MOBILE OTA".PadRight($col1) + $label + $detail) -ForegroundColor Green
    } else {
        Write-Host ("  MOBILE OTA".PadRight($col1) + "[IGNORE] ".PadRight($col2) + "aucun changement detecte") -ForegroundColor DarkGray
    }

    # APK
    if ($Plan.Apk) {
        $label = "[DEPLOYE]".PadRight($col2)
        $detail = if ($nativeFiles.Count -gt 0) { "natif: $($nativeFiles -join ', ')" } else { "force (-ForceApk)" }
        Write-Host ("  APK ANDROID".PadRight($col1) + $label + $detail) -ForegroundColor Yellow
    } else {
        Write-Host ("  APK ANDROID".PadRight($col1) + "[IGNORE] ".PadRight($col2) + "aucun fichier natif modifie") -ForegroundColor DarkGray
    }

    Write-Host ""
    if ($Plan.Mobile) {
        Write-Host "  Message OTA : $UpdateMessage" -ForegroundColor Cyan
        Write-Host ""
    }
}

function Get-UserConfirmation {
    param($Plan, [ref]$UpdateMessage)

    while ($true) {
        Show-DeploymentSummary -Plan $Plan -UpdateMessage $UpdateMessage.Value

        if (-not ($Plan.Backend -or $Plan.Web -or $Plan.Mobile -or $Plan.Apk)) {
            Write-Host "Aucune action planifiee." -ForegroundColor Gray
            return $null
        }

        $response = Read-Host "Confirmer ? (O=continuer / N=annuler / M=modifier)"

        switch ($response.ToUpper()) {
            "O" { return $Plan }
            "N" {
                Write-Host "Deploiement annule." -ForegroundColor Yellow
                return $null
            }
            "M" {
                Write-Host ""
                Write-Host "Modifier le plan :" -ForegroundColor Cyan
                Write-Host "  [B] Ajouter/retirer Backend  (actuellement: $(if ($Plan.Backend) {'OUI'} else {'NON'}))"
                Write-Host "  [W] Ajouter/retirer Web       (actuellement: $(if ($Plan.Web) {'OUI'} else {'NON'}))"
                Write-Host "  [O] Ajouter/retirer OTA       (actuellement: $(if ($Plan.Mobile) {'OUI'} else {'NON'}))"
                Write-Host "  [A] Ajouter/retirer APK       (actuellement: $(if ($Plan.Apk) {'OUI'} else {'NON'}))"
                if ($Plan.Mobile) {
                    Write-Host "  [U] Modifier le message OTA   (actuel: $($UpdateMessage.Value))"
                }
                Write-Host "  [Q] Revenir a la confirmation"
                Write-Host ""
                $choice = Read-Host "Choix"
                switch ($choice.ToUpper()) {
                    "B" { $Plan.Backend = -not $Plan.Backend }
                    "W" { $Plan.Web = -not $Plan.Web }
                    "O" { $Plan.Mobile = -not $Plan.Mobile }
                    "A" { $Plan.Apk = -not $Plan.Apk }
                    "U" {
                        $newMsg = Read-Host "Nouveau message OTA"
                        if ($newMsg.Trim() -ne "") { $UpdateMessage.Value = $newMsg.Trim() }
                    }
                    "Q" { }
                }
            }
            default { Write-Host "Reponse non reconnue, entrez O, N ou M." -ForegroundColor Yellow }
        }
    }
}

function Update-ProdBranch {
    param($Plan)

    Write-Host "[Git] Mise a jour de la branche prod..." -ForegroundColor Yellow
    $currentBranch = git rev-parse --abbrev-ref HEAD

    # Construire le message de merge selon ce qui a ete deploye
    $parts = @()
    if ($Plan.Backend) { $parts += "backend" }
    if ($Plan.Web)     { $parts += "web" }
    if ($Plan.Mobile)  { $parts += "mobile" }
    if ($Plan.Apk)     { $parts += "apk" }
    $deployed = $parts -join "+"

    $appConfigPath = Join-Path $PSScriptRoot "..\..\frontend\app.config.js"
    $appVersion = "?"
    if (Test-Path $appConfigPath) {
        $appConfigContent = Get-Content $appConfigPath -Raw
        $versionMatch = [regex]::Match($appConfigContent, 'version:\s*"([^"]+)"')
        if ($versionMatch.Success) { $appVersion = $versionMatch.Groups[1].Value }
    }

    $mergeMsg = "deploy($deployed): v$appVersion"

    # Commiter le tag de deploiement directement sur main
    git commit --allow-empty -m $mergeMsg
    git push origin main

    # prod avance en fast-forward sur main (pas de commit supplementaire)
    git checkout prod
    git merge main --ff-only
    git push origin prod
    git checkout $currentBranch
    Write-Host "  Branche prod mise a jour ! ($mergeMsg)" -ForegroundColor Green
    Write-Host ""
}

# ---------------------------------------------------------------------------
# CHARGEMENT DE LA CONFIGURATION
# ---------------------------------------------------------------------------

$envFile = Join-Path $PSScriptRoot "..\..\.env.deploy"
if (-not (Test-Path $envFile)) { $envFile = Join-Path $PSScriptRoot ".env.deploy" }
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

Write-Host "`nDeploiement de l'application" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# VERIFICATION DU WORKING TREE
# ---------------------------------------------------------------------------

$dirtyFiles = git status --porcelain 2>$null
if ($dirtyFiles) {
    Write-Host ""
    Write-Host "ATTENTION: Des fichiers non commites existent dans le depot :" -ForegroundColor Yellow
    Write-Host $dirtyFiles -ForegroundColor Gray
    Write-Host "Ces modifications NE SERONT PAS prises en compte (seuls les commits comptent)." -ForegroundColor Yellow
    $dirtyResponse = Read-Host "Continuer quand meme ? (o/N)"
    if ($dirtyResponse -notmatch '^[oO]$') {
        Write-Host "Deploiement annule. Commitez vos changements d'abord." -ForegroundColor Yellow
        exit 0
    }
}

# ---------------------------------------------------------------------------
# DETECTION AUTOMATIQUE
# ---------------------------------------------------------------------------

$plan = Get-DeploymentPlan `
    -ForceBackend:$ForceBackend `
    -ForceWeb:$ForceWeb `
    -ForceMobile:$ForceMobile `
    -ForceApk:$ForceApk

# Message OTA : parametre fourni ou dernier commit
if (-not $UpdateMessage) {
    $UpdateMessage = Get-DefaultUpdateMessage
}

# Cas : rien a deployer
if (-not ($plan.Backend -or $plan.Web -or $plan.Mobile -or $plan.Apk)) {
    Show-DeploymentSummary -Plan $plan -UpdateMessage $UpdateMessage
    Write-Host "Aucun changement detecte depuis le dernier deploiement." -ForegroundColor Green
    Write-Host "Utilisez -ForceBackend, -ForceWeb, -ForceMobile, -ForceApk pour forcer un deploiement." -ForegroundColor Gray
    exit 0
}

# Mode DryRun : afficher et quitter
if ($DryRun) {
    Show-DeploymentSummary -Plan $plan -UpdateMessage $UpdateMessage
    Write-Host "[DryRun] Aucune action executee." -ForegroundColor Cyan
    exit 0
}

# ---------------------------------------------------------------------------
# CONFIRMATION INTERACTIVE
# ---------------------------------------------------------------------------

$msgRef = [ref]$UpdateMessage
$plan = Get-UserConfirmation -Plan $plan -UpdateMessage $msgRef
$UpdateMessage = $msgRef.Value

if (-not $plan) { exit 0 }

# ---------------------------------------------------------------------------
# CHANGELOG (seulement si OTA deploye)
# ---------------------------------------------------------------------------

$changelogTitle = $null
$changelogDesc = $null
$changelogType = $null

if ($plan.Mobile) {
    Write-Host ""
    $addChangelog = Read-Host "Ajouter une entree au changelog ? (O/N)"
    if ($addChangelog -eq "O" -or $addChangelog -eq "o") {
        $changelogTitle = Read-Host "Titre de la mise a jour"
        $changelogDesc  = Read-Host "Description (fonctionnalites/corrections)"
        $changelogType  = Read-Host "Type (feature/fix/improvement) [feature par defaut]"
        if (-not $changelogType -or $changelogType.Trim() -eq "") { $changelogType = "feature" }
    }
}

# ---------------------------------------------------------------------------
# BUMP VERSION (si APK rebuild)
# ---------------------------------------------------------------------------
# [1] APK ANDROID — Build EAS en premier (long, bloquant)
#     Raison : le backend deployé ensuite bumpe MIN_APP_VERSION,
#     ce qui declenche la popup de mise a jour chez les utilisateurs.
#     L'APK doit donc etre pret sur le serveur avant que le backend arrive.
# ---------------------------------------------------------------------------

if ($plan.Apk) {
    if (-not $SkipBuild) {
        Write-Host "[1/4] Build de l'APK Android via EAS..." -ForegroundColor Yellow
        Write-Host ""

        Set-Location frontend

        Write-Host "  Lancement du build EAS (preview profile)..." -ForegroundColor Gray
        Write-Host "  Cela peut prendre 5 a 20 minutes..." -ForegroundColor Gray
        Write-Host ""

        $buildStartTime = Get-Date
        eas build --platform android --profile preview --non-interactive --wait

        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Erreur lors du build EAS de l'APK" -ForegroundColor Red
            Write-Host "  Consultez https://expo.dev pour les logs du build" -ForegroundColor Yellow
            Set-Location ..
            exit 1
        }

        $buildDuration = (Get-Date) - $buildStartTime
        Write-Host ""
        Write-Host "  Build EAS termine en $([math]::Round($buildDuration.TotalMinutes, 1)) minutes" -ForegroundColor Green
        Set-Location ..

        # Bump version APRES le succes du build (evite d'incrementer MIN_APP_VERSION
        # si le build echoue, ce qui declencherait la popup de mise a jour sans APK disponible)
        Write-Host ""
        Write-Host "  Incrementation de la version ($BumpType)..." -ForegroundColor Yellow
        & "$PSScriptRoot\bump-version.ps1" -Part $BumpType
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Erreur lors de l'incrementation de version" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[1/4] Build EAS: SAUTE (build deja en cours ou termine)" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "  Upload de l'APK sur le serveur..." -ForegroundColor Gray
    & "$PSScriptRoot\update-apk.ps1"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors de la mise a jour de l'APK" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
}

# ---------------------------------------------------------------------------
# ECRITURE DU CHANGELOG (apres le bump pour avoir la bonne version)
# ---------------------------------------------------------------------------

if ($changelogTitle) {
    $repoRoot = Join-Path $PSScriptRoot "..\.."
    $appConfigPath = Join-Path $repoRoot "frontend\app.config.js"
    $appConfigContent = Get-Content $appConfigPath -Raw
    $versionMatch = [regex]::Match($appConfigContent, 'version:\s*"([^"]+)"')
    $currentVersion = if ($versionMatch.Success) { $versionMatch.Groups[1].Value } else { "0.0.0" }

    $today = Get-Date -Format "yyyy-MM-dd"
    $newEntry = [ordered]@{
        version     = $currentVersion
        date        = $today
        title       = $changelogTitle
        description = $changelogDesc
        type        = $changelogType
    }

    $changelogPath = Join-Path $repoRoot "docs\CHANGELOG.json"
    $changelog = Get-Content $changelogPath -Raw | ConvertFrom-Json
    if ($changelog -isnot [System.Array]) { $changelog = @($changelog) }
    $updated = @($newEntry) + $changelog
    $updated | ConvertTo-Json -Depth 5 | Set-Content $changelogPath -Encoding UTF8
    Write-Host "Entree ajoutee au changelog (v$currentVersion - $changelogTitle)" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# BACKUP POSTGRESQL
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "Backup de la base de donnees PostgreSQL..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "mkdir -p ${SYNOLOGY_PATH}/backups && if sudo /usr/local/bin/docker ps --filter name=mabibliotheque-postgres --format '{{.Names}}' | grep -q mabibliotheque-postgres; then sudo /usr/local/bin/docker exec mabibliotheque-postgres pg_dump -U bibliotheque bibliotheque > ${SYNOLOGY_PATH}/backups/bibliotheque_`$(date +%Y-%m-%d_%H-%M-%S).sql && echo 'Backup PostgreSQL cree'; else echo 'Pas de conteneur PostgreSQL (premier deploiement?)'; fi"

# ---------------------------------------------------------------------------
# [2] BACKEND
# ---------------------------------------------------------------------------

if ($plan.Backend) {
    Write-Host "[2/4] Build et deploiement du backend..." -ForegroundColor Yellow
    Write-Host ""

    if (-not (Start-DockerIfNeeded)) {
        Write-Host "Impossible de continuer sans Docker Desktop" -ForegroundColor Red
        exit 1
    }

    Set-Location backend

    if (-not (Test-Path "docs")) { New-Item -ItemType Directory -Path "docs" | Out-Null }
    Copy-Item -Path "..\docs\CHANGELOG.json" -Destination "docs\CHANGELOG.json" -Force

    Write-Host "  Build de l'image Docker (AMD64 + ARM64)..." -ForegroundColor Gray
    docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile -t llcelmarll/mabibliotheque-backend:latest --push .

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors du build Docker du backend" -ForegroundColor Red
        exit 1
    }

    Set-Location ..

    Write-Host ""
    Write-Host "  Redeploy sur le NAS..." -ForegroundColor Gray
    & "$PSScriptRoot\redeploy-backend.ps1"

    Write-Host "  Attente du demarrage du conteneur..." -ForegroundColor Gray
    Start-Sleep -Seconds 10

    Write-Host ""
    Write-Host "  Verification des migrations..." -ForegroundColor Gray
    $migrationCheck = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "docker logs mabibliotheque-backend 2>&1 | grep -E '(Migrations appliquees|alembic_version)'"
    if ($migrationCheck) {
        Write-Host "  Migrations detectees dans les logs :" -ForegroundColor Green
        Write-Host "  $migrationCheck" -ForegroundColor Gray
    } else {
        Write-Host "  Aucune confirmation de migration trouvee dans les logs" -ForegroundColor Yellow
        Write-Host "  Verifiez les logs: docker logs mabibliotheque-backend" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "  Backend deploye !" -ForegroundColor Green
    Write-Host "  API URL: https://mabibliotheque.ovh/api" -ForegroundColor Gray
    Write-Host ""
}

# ---------------------------------------------------------------------------
# [3] MOBILE OTA
# ---------------------------------------------------------------------------

if ($plan.Mobile) {
    Write-Host "[3/4] Mise a jour OTA de l'app mobile..." -ForegroundColor Yellow
    Write-Host ""

    $frontendDir       = Join-Path $PSScriptRoot "..\..\frontend"
    $dotEnvPath        = Join-Path $frontendDir ".env"
    $dotEnvBakPath     = Join-Path $frontendDir ".env.bak"
    $dotEnvLocalPath   = Join-Path $frontendDir ".env.local"
    $dotEnvLocalBakPath= Join-Path $frontendDir ".env.local.bak"
    $dotEnvProdPath    = Join-Path $frontendDir ".env.production"
    $dotEnvProdBakPath = Join-Path $frontendDir ".env.production.bak"

    Set-Location $frontendDir

    # Masquer tous les .env locaux pour que Metro ne lise que les vars injectees
    if (Test-Path $dotEnvPath)      { Rename-Item -Path $dotEnvPath      -NewName ".env.bak"            -Force }
    if (Test-Path $dotEnvLocalPath) { Rename-Item -Path $dotEnvLocalPath -NewName ".env.local.bak"      -Force }
    if (Test-Path $dotEnvProdPath)  { Rename-Item -Path $dotEnvProdPath  -NewName ".env.production.bak" -Force }

    $prodEnvContent = @"
EXPO_PUBLIC_API_URL=https://mabibliotheque.ovh/api
APP_VARIANT=production
EXPO_PUBLIC_APP_VARIANT=production
EXPO_PUBLIC_APK_URL=https://mabibliotheque.ovh/bibliotheque.apk
EXPO_PUBLIC_APK_FILENAME=bibliotheque.apk
"@
    Set-Content -Path $dotEnvLocalPath -Value $prodEnvContent -NoNewline

    try {
        eas update --branch production --clear-cache --message $UpdateMessage

        if ($LASTEXITCODE -ne 0) {
            Write-Host "  Erreur lors de la publication OTA" -ForegroundColor Red
            exit 1
        }
    } finally {
        Remove-Item -Path $dotEnvLocalPath -Force -ErrorAction SilentlyContinue
        if (Test-Path $dotEnvBakPath)      { Rename-Item -Path $dotEnvBakPath      -NewName ".env"            -Force }
        if (Test-Path $dotEnvLocalBakPath) { Rename-Item -Path $dotEnvLocalBakPath -NewName ".env.local"      -Force }
        if (Test-Path $dotEnvProdBakPath)  { Rename-Item -Path $dotEnvProdBakPath  -NewName ".env.production" -Force }
    }

    Set-Location $PSScriptRoot\..\..

    Write-Host ""
    Write-Host "  App mobile mise a jour !" -ForegroundColor Green
    Write-Host ""
}

# ---------------------------------------------------------------------------
# [4] FRONTEND WEB
# ---------------------------------------------------------------------------

if ($plan.Web) {
    Write-Host "[4/4] Build et deploiement du frontend Web..." -ForegroundColor Yellow
    Write-Host ""

    if (-not (Start-DockerIfNeeded)) {
        Write-Host "Impossible de continuer sans Docker Desktop" -ForegroundColor Red
        exit 1
    }

    Set-Location frontend

    Write-Host "  Build de l'image Docker (AMD64 + ARM64)..." -ForegroundColor Gray
    docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile.prod -t llcelmarll/mabibliotheque-frontend:latest --push .

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors du build Docker" -ForegroundColor Red
        exit 1
    }

    Set-Location ..

    Write-Host ""
    Write-Host "  Redeploy sur le NAS..." -ForegroundColor Gray
    & "$PSScriptRoot\redeploy-frontend.ps1"

    Write-Host ""
    Write-Host "  Frontend Web deploye !" -ForegroundColor Green
    Write-Host "  URL: https://mabibliotheque.ovh" -ForegroundColor Gray
    Write-Host ""
}

# ---------------------------------------------------------------------------
# [5] MISE A JOUR BRANCHE PROD
# ---------------------------------------------------------------------------

Update-ProdBranch -Plan $plan

# ---------------------------------------------------------------------------
# [6] RESUME
# ---------------------------------------------------------------------------

Write-Host "[Resume] Deploiement termine !" -ForegroundColor Cyan
Write-Host ""
if ($plan.Backend) { Write-Host "  Backend API:   https://mabibliotheque.ovh/api" -ForegroundColor Green }
if ($plan.Web)     { Write-Host "  Frontend Web:  https://mabibliotheque.ovh" -ForegroundColor Green }
if ($plan.Mobile)  { Write-Host "  App Mobile:    Mise a jour OTA publiee (branch: production)" -ForegroundColor Green }
if ($plan.Apk)     { Write-Host "  APK Android:   https://mabibliotheque.ovh/bibliotheque.apk" -ForegroundColor Green }
Write-Host ""
