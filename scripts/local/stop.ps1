#!/usr/bin/env pwsh
param()

$Root = Split-Path (Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent) -Parent

Write-Host ""
Write-Host "Arret des conteneurs Docker..." -ForegroundColor Yellow
Set-Location $Root
docker compose down
Write-Host "Conteneurs arretes." -ForegroundColor Green

# Tuer les processus qui ecoutent sur les ports de dev (uvicorn, expo, vite)
Write-Host "Arret des processus sur les ports 8000/8081/3001..." -ForegroundColor Yellow
foreach ($port in @(8000, 8081, 3001)) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" } | Select-Object -First 1
    if ($conn) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "  Port $port : PID $($conn.OwningProcess) ($($proc.Name))" -ForegroundColor Gray
        # Tuer aussi le processus parent (fenetre cmd/powershell)
        $parentId = (Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)" -ErrorAction SilentlyContinue).ParentProcessId
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        if ($parentId) { Stop-Process -Id $parentId -Force -ErrorAction SilentlyContinue }
    } else {
        Write-Host "  Port $port : rien en ecoute" -ForegroundColor Gray
    }
}

# Fermer les fenetres CMD/PowerShell des services par leur titre
Write-Host "Fermeture des fenetres de service..." -ForegroundColor Yellow
Add-Type -AssemblyName System.Diagnostics.Debug -ErrorAction SilentlyContinue
$titles = @("Backend :8000", "Frontend :8081", "Admin :3001")
Get-Process | Where-Object { $_.MainWindowTitle -ne "" } | ForEach-Object {
    foreach ($title in $titles) {
        if ($_.MainWindowTitle -like "*$title*") {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        }
    }
}

# Nettoyer le fichier de PIDs
$PidFile = Join-Path $Root ".dev-pids"
if (Test-Path $PidFile) { Remove-Item $PidFile }

Write-Host "Fermeture de Chrome..." -ForegroundColor Yellow
Stop-Process -Name "chrome" -Force -ErrorAction SilentlyContinue
Write-Host "Chrome ferme." -ForegroundColor Green

Write-Host "Arret de Docker Desktop..." -ForegroundColor Yellow
taskkill /IM "Docker Desktop.exe" /F 2>$null | Out-Null
taskkill /IM "com.docker.backend.exe" /F 2>$null | Out-Null
taskkill /IM "com.docker.build.exe" /F 2>$null | Out-Null
taskkill /IM "com.docker.service.exe" /F 2>$null | Out-Null
Write-Host "Docker Desktop arrete." -ForegroundColor Green