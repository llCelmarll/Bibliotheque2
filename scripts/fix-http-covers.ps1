# Script pour corriger les URLs HTTP → HTTPS dans la base de production

Write-Host "Correction des URLs HTTP → HTTPS..." -ForegroundColor Cyan

# Configuration (même valeurs que dans les autres scripts de déploiement)
$SYNOLOGY_USER = "QuentinDDC"
$SYNOLOGY_IP = "192.168.1.124"
$SYNOLOGY_PATH = "/volume1/docker/mabibliotheque"

# Compter combien de lignes seront affectées
$count = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sqlite3 ${SYNOLOGY_PATH}/data/bibliotheque.db \`"SELECT COUNT(*) FROM books WHERE cover_url LIKE 'http://%';\`""

Write-Host "Nombre d'URLs à corriger : $count" -ForegroundColor Yellow

if ($count -eq 0) {
    Write-Host "Aucune URL à corriger !" -ForegroundColor Green
    exit 0
}

# Demander confirmation
$confirmation = Read-Host "Voulez-vous corriger ces $count URL(s) ? (oui/non)"

if ($confirmation -ne "oui") {
    Write-Host "Opération annulée." -ForegroundColor Red
    exit 1
}

# Créer un backup avant modification
$backupName = "bibliotheque_before_fix_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
Write-Host "Création du backup : $backupName" -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "cp ${SYNOLOGY_PATH}/data/bibliotheque.db ${SYNOLOGY_PATH}/backups/$backupName"

# Appliquer la correction
Write-Host "Application des corrections..." -ForegroundColor Yellow
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sqlite3 ${SYNOLOGY_PATH}/data/bibliotheque.db \`"UPDATE books SET cover_url = REPLACE(cover_url, 'http://', 'https://') WHERE cover_url LIKE 'http://%';\`""

# Vérifier que ça a fonctionné
$remaining = ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sqlite3 ${SYNOLOGY_PATH}/data/bibliotheque.db \`"SELECT COUNT(*) FROM books WHERE cover_url LIKE 'http://%';\`""

if ($remaining -eq 0) {
    Write-Host "✅ Correction réussie ! Toutes les URLs sont maintenant en HTTPS." -ForegroundColor Green
} else {
    Write-Host "⚠️ $remaining URL(s) restent en HTTP. Vérifiez le log." -ForegroundColor Red
}
