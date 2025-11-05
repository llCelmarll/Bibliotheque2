# Script pour mettre à jour l'APK sur le NAS avec le dernier build EAS
# Ce script récupère automatiquement le dernier APK Android depuis EAS

param(
    [string]$Branch = "production"
)

$SYNOLOGY_USER = "QuentinDDC"
$SYNOLOGY_IP = "192.168.1.124"

Write-Host "`nMise à jour de l'APK Android sur le NAS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Récupérer l'URL du dernier APK depuis EAS
Write-Host "Récupération du dernier build Android..." -ForegroundColor Yellow
$buildInfo = eas build:list --platform android --limit 1 --json --non-interactive | ConvertFrom-Json

if (-not $buildInfo -or $buildInfo.Count -eq 0) {
    Write-Host "Aucun build trouvé" -ForegroundColor Red
    exit 1
}

$latestBuild = $buildInfo[0]
$apkUrl = $latestBuild.artifacts.applicationArchiveUrl

if (-not $apkUrl) {
    Write-Host "Pas d'URL d'APK disponible pour ce build" -ForegroundColor Red
    Write-Host "Build ID: $($latestBuild.id)" -ForegroundColor Gray
    Write-Host "Status: $($latestBuild.status)" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "Dernier build trouvé:" -ForegroundColor Green
Write-Host "  Build ID: $($latestBuild.id)" -ForegroundColor Gray
Write-Host "  Version: $($latestBuild.appVersion)" -ForegroundColor Gray
Write-Host "  Date: $($latestBuild.createdAt)" -ForegroundColor Gray
Write-Host "  URL APK: $apkUrl" -ForegroundColor Gray
Write-Host ""

# 2. Télécharger l'APK directement dans le container via SSH
Write-Host "Téléchargement de l'APK sur le NAS..." -ForegroundColor Yellow

$sshCommand = "sudo /usr/local/bin/docker exec mabibliotheque-frontend wget -O /usr/share/nginx/html/bibliotheque.apk '$apkUrl'"

ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" $sshCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "APK mis à jour avec succès !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Lien de téléchargement:" -ForegroundColor Cyan
    Write-Host "https://mabibliotheque.ovh/bibliotheque.apk" -ForegroundColor White
    Write-Host ""
    Write-Host "Informations du build:" -ForegroundColor Cyan
    Write-Host "  Build: $($latestBuild.id)" -ForegroundColor White
    Write-Host "  Version: $($latestBuild.appVersion)" -ForegroundColor White
    Write-Host "  Runtime: $($latestBuild.runtimeVersion)" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Erreur lors du téléchargement de l'APK" -ForegroundColor Red
    exit 1
}
