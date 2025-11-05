# Script pour mettre à jour l'URL de l'APK dans nginx
# Usage: .\update-apk-url.ps1 <new-apk-id>
# Exemple: .\update-apk-url.ps1 oJGWpnV1j1Yr7KJcapRs4L

param(
    [Parameter(Mandatory=$true)]
    [string]$ApkId
)

Write-Host "`nMise a jour de l'URL APK..." -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

$NEW_URL = "https://expo.dev/artifacts/eas/$ApkId.apk"

# Mise à jour de nginx-frontend.conf
$configPath = "nginx-frontend.conf"
$content = Get-Content $configPath -Raw

# Remplacer l'ancienne URL par la nouvelle
$pattern = 'return 302 https://expo\.dev/artifacts/eas/[^;]+\.apk;'
$replacement = "return 302 $NEW_URL;"

if ($content -match $pattern) {
    $newContent = $content -replace $pattern, $replacement
    Set-Content -Path $configPath -Value $newContent
    
    Write-Host "✓ nginx-frontend.conf mis a jour" -ForegroundColor Green
    Write-Host "  Nouvelle URL: $NEW_URL" -ForegroundColor Gray
    Write-Host ""
    
    # Mise à jour de deploy-all.ps1
    $deployPath = "..\deploy-all.ps1"
    $deployContent = Get-Content $deployPath -Raw
    $deployPattern = 'URL EAS: https://expo\.dev/artifacts/eas/[^"]+\.apk'
    $deployReplacement = "URL EAS: $NEW_URL"
    
    if ($deployContent -match $deployPattern) {
        $newDeployContent = $deployContent -replace $deployPattern, $deployReplacement
        Set-Content -Path $deployPath -Value $newDeployContent
        Write-Host "✓ deploy-all.ps1 mis a jour" -ForegroundColor Green
        Write-Host ""
    }
    
    Write-Host "Pour appliquer les changements:" -ForegroundColor Yellow
    Write-Host "  1. Commit et push les modifications" -ForegroundColor White
    Write-Host "  2. Rebuild l'image Docker: docker buildx build ..." -ForegroundColor White
    Write-Host "  3. Redeploy: ..\redeploy-frontend.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou utilisez simplement: ..\deploy-all.ps1 -SkipMobile" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "✗ Pattern non trouve dans nginx-frontend.conf" -ForegroundColor Red
    Write-Host "  Verifiez le fichier manuellement" -ForegroundColor Yellow
    exit 1
}
