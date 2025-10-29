# Script PowerShell d'arrêt pour l'application Bibliothèque
# Usage: .\scripts\stop.ps1

Write-Host "🛑 Arrêt de l'application Bibliothèque..." -ForegroundColor Red

# Arrêter et supprimer les conteneurs
Write-Host "📦 Arrêt des conteneurs..." -ForegroundColor Yellow
docker-compose down

# Option pour nettoyer complètement (volumes, images, etc.)
$cleanup = Read-Host "Voulez-vous supprimer les volumes et images? (y/N)"
if ($cleanup -eq "y" -or $cleanup -eq "Y") {
    Write-Host "🧹 Nettoyage complet..." -ForegroundColor Yellow
    docker-compose down -v --rmi all
    docker system prune -f
}

Write-Host "✅ Application arrêtée avec succès!" -ForegroundColor Green