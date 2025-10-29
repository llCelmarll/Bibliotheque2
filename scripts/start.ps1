# Script PowerShell de démarrage pour l'application Bibliothèque
# Usage: .\scripts\start.ps1

Write-Host "🚀 Démarrage de l'application Bibliothèque..." -ForegroundColor Green

# Vérifier que Docker est installé
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker n'est pas installé. Veuillez l'installer avant de continuer." -ForegroundColor Red
    exit 1
}

try {
    docker compose version | Out-Null
} catch {
    try {
        docker-compose --version | Out-Null
    } catch {
        Write-Host "❌ Docker Compose n'est pas installé. Veuillez l'installer avant de continuer." -ForegroundColor Red
        exit 1
    }
}

# Créer les répertoires nécessaires
Write-Host "📁 Création des répertoires..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "docker\nginx\ssl" -Force | Out-Null

# Build et démarrage des services
Write-Host "🔨 Construction et démarrage des services Docker..." -ForegroundColor Yellow
docker-compose up --build -d

# Attendre que les services soient prêts
Write-Host "⏳ Attente du démarrage des services..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Vérifier le statut des services
Write-Host "🔍 Vérification du statut des services..." -ForegroundColor Yellow
docker-compose ps

# Afficher les URLs d'accès
Write-Host ""
Write-Host "✅ Application démarrée avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Frontend (App): http://localhost:8081" -ForegroundColor Cyan
Write-Host "🔧 Backend (API): http://localhost:8000" -ForegroundColor Cyan
Write-Host "📚 Documentation API: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "🌐 Via Nginx: http://localhost" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour arrêter l'application: docker-compose down" -ForegroundColor Yellow
Write-Host "Pour voir les logs: docker-compose logs -f" -ForegroundColor Yellow