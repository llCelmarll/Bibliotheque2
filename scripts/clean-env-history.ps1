# Script PowerShell pour nettoyer les fichiers .env de l'historique Git
# ⚠️ ATTENTION: Cette opération réécrit l'historique Git !
# Usage: .\scripts\clean-env-history.ps1

Write-Host "🚨 ATTENTION: Nettoyage de l'historique Git" -ForegroundColor Red
Write-Host "Cette opération va réécrire l'historique et supprimer définitivement les fichiers .env" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Êtes-vous sûr de vouloir continuer? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Opération annulée" -ForegroundColor Red
    exit 1
}

Write-Host "🧹 Nettoyage en cours..." -ForegroundColor Yellow

# Retirer les fichiers .env de tout l'historique Git
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env frontend/.env backend/.env" --prune-empty --tag-name-filter cat -- --all

Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Vérifier que vos fichiers .env locaux existent toujours" -ForegroundColor White  
Write-Host "2. git push --force-with-lease origin main (si vous voulez pousser les changements)" -ForegroundColor White
Write-Host "3. Prévenir les autres développeurs de faire git clone à nouveau" -ForegroundColor White
Write-Host ""
Write-Host "⚠️ Les autres développeurs devront faire:" -ForegroundColor Yellow
Write-Host "git fetch origin" -ForegroundColor White
Write-Host "git reset --hard origin/main" -ForegroundColor White