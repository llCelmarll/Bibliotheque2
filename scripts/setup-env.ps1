# Script de configuration initiale sécurisée
# Usage: .\scripts\setup-env.ps1

Write-Host "Configuration initiale de l'environnement..." -ForegroundColor Green

# Vérifier si les fichiers .env existent déjà
$envFiles = @(
    @{Path = ".env"; Template = ".env.example"},
    @{Path = "frontend/.env"; Template = "frontend/.env.example"},
    @{Path = "backend/.env"; Template = "backend/.env.example"}
)

foreach ($env in $envFiles) {
    if (Test-Path $env.Path) {
        Write-Host "⚠️  Le fichier $($env.Path) existe déjà" -ForegroundColor Yellow
        $overwrite = Read-Host "Voulez-vous le remplacer? (y/N)"
        if ($overwrite -ne "y" -and $overwrite -ne "Y") {
            Write-Host "➡️  Conservation du fichier existant: $($env.Path)" -ForegroundColor Cyan
            continue
        }
    }
    
    if (Test-Path $env.Template) {
        Copy-Item $env.Template $env.Path
        Write-Host "✅ Créé: $($env.Path) depuis $($env.Template)" -ForegroundColor Green
    } else {
        Write-Host "❌ Template manquant: $($env.Template)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Generation d'une cle secrete..." -ForegroundColor Yellow
& ".\scripts\generate-secret-key.ps1"

Write-Host ""
Write-Host "📝 ACTIONS REQUISES:" -ForegroundColor Cyan
Write-Host "1. Éditez les fichiers .env avec vos vraies valeurs" -ForegroundColor White
Write-Host "2. Remplacez SECRET_KEY par la clé générée ci-dessus" -ForegroundColor White  
Write-Host "3. Changez EXPO_PUBLIC_API_URL selon votre environnement" -ForegroundColor White
Write-Host "4. JAMAIS commiter ces fichiers .env !" -ForegroundColor Red
Write-Host ""
Write-Host "INFO Les fichiers .env sont automatiquement ignores par Git" -ForegroundColor Cyan