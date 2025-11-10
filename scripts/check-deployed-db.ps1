# Script de vérification de la base de données déployée sur le NAS
# Vérifie les utilisateurs et les statistiques de la base

$NAS_HOST = "192.168.1.124"
$NAS_USER = "QuentinDDC"
$NAS_PATH = "/volume1/docker/mabibliotheque"

Write-Host "`nVerification de la base de donnees deployee" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier que la base existe
Write-Host "[1/4] Verification de l'existence de la base..." -ForegroundColor Yellow
$dbExists = ssh "${NAS_USER}@${NAS_HOST}" "if [ -f ${NAS_PATH}/data/bibliotheque.db ]; then echo 'EXISTS'; else echo 'NOT_FOUND'; fi"

if ($dbExists -match "NOT_FOUND") {
    Write-Host "ERREUR: Base de donnees introuvable !" -ForegroundColor Red
    Write-Host "   Chemin: ${NAS_PATH}/data/bibliotheque.db" -ForegroundColor Gray
    exit 1
}

Write-Host "OK: Base de donnees trouvee" -ForegroundColor Green

# 2. Taille de la base
Write-Host ""
Write-Host "[2/4] Taille de la base de donnees..." -ForegroundColor Yellow
ssh "${NAS_USER}@${NAS_HOST}" "ls -lh ${NAS_PATH}/data/bibliotheque.db"

# 3. Compter les utilisateurs
Write-Host ""
Write-Host "[3/4] Comptage des utilisateurs..." -ForegroundColor Yellow
$userCount = ssh "${NAS_USER}@${NAS_HOST}" "sqlite3 ${NAS_PATH}/data/bibliotheque.db 'SELECT COUNT(*) FROM users;' 2>/dev/null"

if ($userCount -match "^\d+$") {
    Write-Host "Nombre d'utilisateurs: $userCount" -ForegroundColor Green
} else {
    Write-Host "ATTENTION: Impossible de compter les utilisateurs (table absente?)" -ForegroundColor Yellow
}

# 4. Lister les utilisateurs
Write-Host ""
Write-Host "[4/4] Liste des utilisateurs..." -ForegroundColor Yellow
Write-Host ""

ssh "${NAS_USER}@${NAS_HOST}" "sqlite3 ${NAS_PATH}/data/bibliotheque.db 'SELECT id, email, is_active, created_at FROM users ORDER BY created_at DESC;'"

# 5. Statistiques supplémentaires
Write-Host ""
Write-Host "Statistiques supplementaires" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Compter les livres
$bookCount = ssh "${NAS_USER}@${NAS_HOST}" "sqlite3 ${NAS_PATH}/data/bibliotheque.db 'SELECT COUNT(*) FROM book;' 2>/dev/null"
if ($bookCount -match "^\d+$") {
    Write-Host "Nombre de livres: $bookCount" -ForegroundColor White
}

# Compter les auteurs
$authorCount = ssh "${NAS_USER}@${NAS_HOST}" "sqlite3 ${NAS_PATH}/data/bibliotheque.db 'SELECT COUNT(*) FROM author;' 2>/dev/null"
if ($authorCount -match "^\d+$") {
    Write-Host "Nombre d'auteurs: $authorCount" -ForegroundColor White
}

# Compter les éditeurs
$publisherCount = ssh "${NAS_USER}@${NAS_HOST}" "sqlite3 ${NAS_PATH}/data/bibliotheque.db 'SELECT COUNT(*) FROM publisher;' 2>/dev/null"
if ($publisherCount -match "^\d+$") {
    Write-Host "Nombre d'editeurs: $publisherCount" -ForegroundColor White
}

# Dernière modification de la base
Write-Host ""
Write-Host "Derniere modification:" -ForegroundColor Cyan
ssh "${NAS_USER}@${NAS_HOST}" "stat ${NAS_PATH}/data/bibliotheque.db 2>/dev/null | grep Modify"

# Lister les backups disponibles
Write-Host ""
Write-Host "Backups disponibles" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
$backups = ssh "${NAS_USER}@${NAS_HOST}" "ls -lh ${NAS_PATH}/backups/bibliotheque_*.db 2>/dev/null | tail -5"
if ($backups) {
    Write-Host $backups -ForegroundColor Gray
} else {
    Write-Host "Aucun backup trouve" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Verification terminee !" -ForegroundColor Green
Write-Host ""
