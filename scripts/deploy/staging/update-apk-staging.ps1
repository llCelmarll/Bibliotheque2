# Télécharge le dernier APK staging depuis EAS et l'héberge sur le NAS
# L'APK sera accessible sur : http://192.168.1.124:8090/bibliotheque-staging.apk

param(
    [string]$ApkUrl
)

# Chargement des variables de déploiement
$envFile = Join-Path $PSScriptRoot "..\..\..\\.env.deploy"
if (-not (Test-Path $envFile)) { $envFile = Join-Path $PSScriptRoot ".env.deploy" }
if (-not (Test-Path $envFile)) {
    Write-Host "Erreur: fichier .env.deploy introuvable" -ForegroundColor Red
    exit 1
}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), "Process")
    }
}

$STAGING_PATH = "/volume1/docker/mabibliotheque-staging"

Write-Host "Mise a jour de l'APK STAGING..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Si pas d'URL fournie, récupérer le dernier build staging
if (-not $ApkUrl) {
    Write-Host "Recuperation du dernier build APK staging..." -ForegroundColor Yellow
    Set-Location "$PSScriptRoot\..\..\..\frontend"

    $apkJson = eas build:list --platform android --profile staging --limit 5 --json --non-interactive 2>$null
    if ($LASTEXITCODE -ne 0 -or !$apkJson) {
        Write-Host "Erreur lors de la recuperation du build APK staging" -ForegroundColor Red
        exit 1
    }

    $buildInfo = $apkJson | ConvertFrom-Json
    if ($buildInfo -isnot [array]) { $buildInfo = @($buildInfo) }

    $finishedBuild = $buildInfo | Where-Object { $_.status -eq "FINISHED" -and $_.artifacts.buildUrl } | Select-Object -First 1
    if (-not $finishedBuild) {
        Write-Host "Aucun build staging FINISHED trouve" -ForegroundColor Red
        Write-Host "Lancez d'abord: eas build --platform android --profile staging" -ForegroundColor Yellow
        exit 1
    }
    $ApkUrl = $finishedBuild.artifacts.buildUrl
    Write-Host "  Build utilise: $($finishedBuild.appVersion) ($($finishedBuild.id.Substring(0,8))...)" -ForegroundColor Gray

    Set-Location "$PSScriptRoot\..\..\..\"
}

Write-Host "URL APK: $ApkUrl" -ForegroundColor Gray
Write-Host ""

# Télécharger l'APK localement
Write-Host "Telechargement de l'APK staging..." -ForegroundColor Yellow
$tempApk = "$env:TEMP\bibliotheque-staging.apk"

try {
    Invoke-WebRequest -Uri $ApkUrl -OutFile $tempApk -UseBasicParsing
    $apkSize = (Get-Item $tempApk).Length / 1MB
    Write-Host "  APK telecharge: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Green
} catch {
    Write-Host "  Erreur lors du telechargement: $_" -ForegroundColor Red
    exit 1
}

# Upload sur le NAS
Write-Host ""
Write-Host "Upload de l'APK staging sur le serveur..." -ForegroundColor Yellow
ssh "$env:SYNOLOGY_USER@$env:SYNOLOGY_IP" "mkdir -p ${STAGING_PATH}/apk"
& cmd /c "ssh `"$env:SYNOLOGY_USER@$env:SYNOLOGY_IP`" `"cat > ${STAGING_PATH}/apk/bibliotheque-staging.apk`" < `"$tempApk`""

if ($LASTEXITCODE -eq 0) {
    Write-Host "  APK staging uploade !" -ForegroundColor Green
    $remoteSize = ssh "$env:SYNOLOGY_USER@$env:SYNOLOGY_IP" "ls -lh ${STAGING_PATH}/apk/bibliotheque-staging.apk | awk '{print `$5}'"
    Write-Host "  Taille sur le serveur: $remoteSize" -ForegroundColor Gray
} else {
    Write-Host "  Erreur lors de l'upload" -ForegroundColor Red
    exit 1
}

Remove-Item $tempApk -Force

Write-Host ""
Write-Host "APK staging disponible sur: http://$env:SYNOLOGY_IP:8090/bibliotheque-staging.apk" -ForegroundColor Green
Write-Host ""
