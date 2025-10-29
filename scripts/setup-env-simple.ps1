# Script de configuration initiale securisee - Version Simple
# Usage: .\scripts\setup-env-simple.ps1

Write-Host "Configuration initiale de l'environnement..." -ForegroundColor Green

# Creer les fichiers .env depuis les templates
$templates = @("frontend/.env.example", "backend/.env.example", ".env.example")

foreach ($template in $templates) {
    if (Test-Path $template) {
        $envFile = $template -replace "\.example", ""
        if (-not (Test-Path $envFile)) {
            Copy-Item $template $envFile
            Write-Host "Cree: $envFile" -ForegroundColor Green
        } else {
            Write-Host "Existe deja: $envFile" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "ACTIONS REQUISES:" -ForegroundColor Cyan
Write-Host "1. Editez les fichiers .env avec vos vraies valeurs" -ForegroundColor White
Write-Host "2. Executez: .\scripts\generate-secret-key.ps1" -ForegroundColor White
Write-Host "3. Remplacez SECRET_KEY dans .env et backend/.env" -ForegroundColor White
Write-Host "4. Changez EXPO_PUBLIC_API_URL selon votre IP" -ForegroundColor White