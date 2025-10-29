# Script de test Docker simple
# Usage: .\scripts\test-docker.ps1

Write-Host "Test de l'installation Docker..." -ForegroundColor Yellow

# Test Docker
try {
    $dockerVersion = docker --version
    Write-Host "OK Docker installe: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Docker non disponible" -ForegroundColor Red
    exit 1
}

# Test Docker Compose
try {
    $composeVersion = docker-compose --version
    Write-Host "OK Docker Compose installe: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Docker Compose non disponible" -ForegroundColor Red
    exit 1
}

# Test connexion Docker daemon
Write-Host "Test de connexion au daemon Docker..." -ForegroundColor Yellow
try {
    docker info | Select-Object -First 5
    Write-Host "OK Connexion Docker" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Impossible de se connecter au daemon Docker" -ForegroundColor Red
    Write-Host "INFO Essayez de redemarrer Docker Desktop" -ForegroundColor Cyan
    exit 1
}

# Test simple de conteneur
Write-Host "Test avec un conteneur simple..." -ForegroundColor Yellow
try {
    docker run --rm hello-world | Out-Null
    Write-Host "OK Test conteneur reussi" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Impossible de lancer un conteneur de test" -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS Docker fonctionne correctement!" -ForegroundColor Green