# Demarre l'environnement de dev mobile (Expo Go via USB)
# Usage: .\scripts\start-dev-mobile.ps1

Write-Host "Verification du telephone connecte en USB..."
$devices = adb devices | Select-String "device$"
if (-not $devices) {
    Write-Host "Aucun telephone detecte en USB. Branche le telephone et reessaie." -ForegroundColor Red
    exit 1
}
Write-Host "Telephone detecte." -ForegroundColor Green

Write-Host "Configuration ADB reverse..."
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8000 tcp:8000
Write-Host "Ports 8081 et 8000 forwardes via USB." -ForegroundColor Green

Write-Host "Verification du backend..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -TimeoutSec 3 -UseBasicParsing
    Write-Host "Backend OK." -ForegroundColor Green
} catch {
    Write-Host "Backend non accessible sur localhost:8000 - lance start-backend-local.ps1 d'abord." -ForegroundColor Yellow
}

Write-Host "Demarrage de Metro..."
Set-Location "$PSScriptRoot\..\frontend"
$env:EXPO_PUBLIC_API_URL = "http://localhost:8000"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx expo start --clear" -WorkingDirectory (Get-Location)

Write-Host "En attente du demarrage de Metro (5s)..."
Start-Sleep -Seconds 5

Write-Host "Ouverture d'Expo Go sur le telephone..."
adb shell am start -a android.intent.action.VIEW -d "exp://localhost:8081" host.exp.exponent

Write-Host ""
Write-Host "C'est parti ! L'app devrait s'ouvrir sur le telephone." -ForegroundColor Green
