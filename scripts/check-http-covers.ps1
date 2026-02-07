# Script pour vérifier les URLs HTTP dans les couvertures de la base de production

Write-Host "Vérification des URLs de couverture en HTTP..." -ForegroundColor Cyan

# Configuration (même valeurs que dans les autres scripts de déploiement)
$SYNOLOGY_USER = "QuentinDDC"
$SYNOLOGY_IP = "192.168.1.124"
$SYNOLOGY_PATH = "/volume1/docker/mabibliotheque"

# Connexion SSH et requête SQL
Write-Host "Connexion à ${SYNOLOGY_USER}@${SYNOLOGY_IP}..." -ForegroundColor Gray
ssh "${SYNOLOGY_USER}@${SYNOLOGY_IP}" "sqlite3 ${SYNOLOGY_PATH}/data/bibliotheque.db \`"SELECT isbn, title, cover_url FROM books WHERE cover_url IS NOT NULL AND cover_url LIKE 'http://%';\`""

Write-Host "`nPour corriger ces URLs en HTTPS, utilisez le script fix-http-covers.ps1" -ForegroundColor Yellow
