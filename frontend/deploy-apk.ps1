# Script pour deployer l'APK Android sur le NAS
# Utilise soit un APK local, soit telecharge le dernier depuis EAS

param(
    [string]$ApkPath = ""  # Chemin vers un APK local (optionnel)
)

Write-Host "Deploiement APK Android" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Si aucun APK fourni, on utilise le dernier build EAS
if (-not $ApkPath) {
    Write-Host "Recuperation du lien de telechargement APK depuis EAS..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Consultez le dashboard EAS pour telecharger l'APK:" -ForegroundColor Cyan
    Write-Host "https://expo.dev/accounts/lcelmarl/projects/bibliotheque/builds" -ForegroundColor White
    Write-Host ""
    Write-Host "Une fois telecharge, relancez ce script avec:" -ForegroundColor Yellow
    Write-Host "  .\deploy-apk.ps1 -ApkPath ""chemin\vers\votre.apk""" -ForegroundColor White
    exit 0
}

# Deployer l'APK sur le NAS
if (Test-Path $ApkPath) {
    Write-Host "Deploiement de l'APK sur le NAS..." -ForegroundColor Yellow
    Write-Host ""
    
    $SYNOLOGY_USER = "QuentinDDC"
    $SYNOLOGY_IP = "192.168.1.124"
    
    # Copier l'APK vers le NAS temporairement
    Write-Host "  Copie vers le NAS..." -ForegroundColor Gray
    scp "$ApkPath" "${SYNOLOGY_USER}@${SYNOLOGY_IP}:/tmp/bibliotheque.apk"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Erreur lors de la copie SCP" -ForegroundColor Red
        exit 1
    }
    
    # Copier dans le conteneur frontend
    Write-Host "  Installation dans le conteneur..." -ForegroundColor Gray
    ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sudo /usr/local/bin/docker cp /tmp/bibliotheque.apk mabibliotheque-frontend:/usr/share/nginx/html/bibliotheque.apk && rm /tmp/bibliotheque.apk"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "APK deploye avec succes !" -ForegroundColor Green
        Write-Host ""
        Write-Host "Lien de telechargement:" -ForegroundColor Cyan
        Write-Host "https://mabibliotheque.ovh/bibliotheque.apk" -ForegroundColor White
        Write-Host ""
        Write-Host "Instructions pour les testeurs:" -ForegroundColor Cyan
        Write-Host "1. Ouvrir ce lien sur Android: https://mabibliotheque.ovh/bibliotheque.apk" -ForegroundColor White
        Write-Host "2. Autoriser 'Sources inconnues' si demande" -ForegroundColor White
        Write-Host "3. Installer l'application" -ForegroundColor White
    } else {
        Write-Host "  Erreur lors du deploiement" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Erreur: APK non trouve" -ForegroundColor Red
    Write-Host "Utilisez -ApkPath pour specifier un APK local" -ForegroundColor Gray
    exit 1
}
