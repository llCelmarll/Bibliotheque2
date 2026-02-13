# Script pour télécharger et héberger l'APK Android sur le serveur
# Au lieu de rediriger vers Expo, on héberge l'APK directement

param(
    [string]$ApkUrl
)

Write-Host "Mise à jour de l'APK Android..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Si pas d'URL fournie, récupérer le dernier build
if (-not $ApkUrl) {
    Write-Host "Récupération du lien du dernier build APK..." -ForegroundColor Yellow
    Set-Location "$PSScriptRoot\..\..\frontend"

    $apkJson = eas build:list --platform android --profile preview --limit 1 --json --non-interactive 2>$null
    if ($LASTEXITCODE -ne 0 -or !$apkJson) {
        Write-Host "Erreur lors de la récupération du build APK" -ForegroundColor Red
        exit 1
    }

    $buildInfo = $apkJson | ConvertFrom-Json
    if ($buildInfo -is [array]) {
        $ApkUrl = $buildInfo[0].artifacts.buildUrl
    } else {
        $ApkUrl = $buildInfo.artifacts.buildUrl
    }

    Set-Location "$PSScriptRoot\..\.."
}

Write-Host "URL APK: $ApkUrl" -ForegroundColor Gray
Write-Host ""

# Télécharger l'APK localement
Write-Host "Téléchargement de l'APK..." -ForegroundColor Yellow
$tempApk = "$env:TEMP\bibliotheque.apk"

try {
    Invoke-WebRequest -Uri $ApkUrl -OutFile $tempApk -UseBasicParsing
    $apkSize = (Get-Item $tempApk).Length / 1MB
    Write-Host "  APK téléchargé: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Green
} catch {
    Write-Host "  Erreur lors du téléchargement de l'APK: $_" -ForegroundColor Red
    exit 1
}

# Upload de l'APK sur le serveur
Write-Host ""
Write-Host "Upload de l'APK sur le serveur..." -ForegroundColor Yellow

# Créer le répertoire s'il n'existe pas
ssh "$env:SYNOLOGY_USER@$env:SYNOLOGY_IP" "mkdir -p $env:SYNOLOGY_PATH/apk"

# Copier l'APK sur le serveur (scp ne fonctionne pas sur le NAS Synology)
& cmd /c "ssh `"$env:SYNOLOGY_USER@$env:SYNOLOGY_IP`" `"cat > $env:SYNOLOGY_PATH/apk/bibliotheque.apk`" < `"$tempApk`""

if ($LASTEXITCODE -eq 0) {
    Write-Host "  APK uploadé avec succès !" -ForegroundColor Green

    # Vérifier la taille sur le serveur
    $remoteSize = ssh "$env:SYNOLOGY_USER@$env:SYNOLOGY_IP" "ls -lh $env:SYNOLOGY_PATH/apk/bibliotheque.apk | awk '{print `$5}'"
    Write-Host "  Taille sur le serveur: $remoteSize" -ForegroundColor Gray
} else {
    Write-Host "  Erreur lors de l'upload de l'APK" -ForegroundColor Red
    exit 1
}

# Nettoyer le fichier temporaire
Remove-Item $tempApk -Force

Write-Host ""
Write-Host "APK disponible sur: https://mabibliotheque.ovh/bibliotheque.apk" -ForegroundColor Green
Write-Host ""
