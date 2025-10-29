# Script PowerShell pour générer une clé secrète sécurisée
# Usage: .\scripts\generate-secret-key.ps1

Write-Host "🔐 Génération d'une clé secrète sécurisée..." -ForegroundColor Yellow

# Générer une clé secrète cryptographiquement sécurisée
$bytes = New-Object byte[] 64
[System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$secretKey = [System.Convert]::ToBase64String($bytes)

Write-Host ""
Write-Host "✅ Clé secrète générée:" -ForegroundColor Green
Write-Host $secretKey -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Instructions:" -ForegroundColor Yellow
Write-Host "1. Copiez cette clé" -ForegroundColor White
Write-Host "2. Remplacez la valeur SECRET_KEY dans votre fichier .env" -ForegroundColor White
Write-Host "3. JAMAIS commiter cette clé dans Git!" -ForegroundColor Red
Write-Host ""
Write-Host "💡 Cette clé est unique et cryptographiquement sécurisée." -ForegroundColor Cyan