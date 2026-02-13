# Script d'incrementation automatique de version
# Usage: .\bump-version.ps1 [-Part patch|minor|major]

param(
    [ValidateSet("patch", "minor", "major")]
    [string]$Part = "patch"
)

$appConfigPath = Join-Path $PSScriptRoot "..\..\frontend\app.config.js"
$envSynologyPath = Join-Path $PSScriptRoot "..\..\.env.synology"

# Verifier que app.config.js existe
if (-not (Test-Path $appConfigPath)) {
    Write-Host "Erreur: $appConfigPath introuvable" -ForegroundColor Red
    exit 1
}

# Lire la version courante
$content = Get-Content $appConfigPath -Raw
if ($content -match 'version:\s*"(\d+)\.(\d+)\.(\d+)"') {
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    $patch = [int]$Matches[3]
    $oldVersion = "$major.$minor.$patch"
} else {
    Write-Host "Erreur: impossible de trouver la version dans app.config.js" -ForegroundColor Red
    exit 1
}

# Incrementer
switch ($Part) {
    "major" {
        $major++
        $minor = 0
        $patch = 0
    }
    "minor" {
        $minor++
        $patch = 0
    }
    "patch" {
        $patch++
    }
}

$newVersion = "$major.$minor.$patch"

Write-Host ""
Write-Host "Incrementation de version ($Part)" -ForegroundColor Cyan
Write-Host "  $oldVersion -> $newVersion" -ForegroundColor Yellow
Write-Host ""

# Mettre a jour app.config.js
$content = $content -replace "version:\s*`"$oldVersion`"", "version: `"$newVersion`""
Set-Content $appConfigPath -Value $content -NoNewline

Write-Host "  app.config.js mis a jour" -ForegroundColor Green

# Mettre a jour .env.synology si le fichier existe
if (Test-Path $envSynologyPath) {
    $envContent = Get-Content $envSynologyPath -Raw

    if ($envContent -match "MIN_APP_VERSION=") {
        # Remplacer la valeur existante
        $envContent = $envContent -replace "MIN_APP_VERSION=.*", "MIN_APP_VERSION=$newVersion"
    } else {
        # Ajouter la variable
        $envContent = $envContent.TrimEnd() + "`n`n# Version minimale de l'app mobile`nMIN_APP_VERSION=$newVersion`n"
    }

    Set-Content $envSynologyPath -Value $envContent -NoNewline
    Write-Host "  .env.synology mis a jour (MIN_APP_VERSION=$newVersion)" -ForegroundColor Green
} else {
    Write-Host "  .env.synology non trouve - MIN_APP_VERSION non mis a jour" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Version incrementee: $newVersion" -ForegroundColor Green
Write-Host ""
