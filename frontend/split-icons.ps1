# Script pour découper l'image générée par ChatGPT
# Nécessite ImageMagick : https://imagemagick.org/script/download.php

param(
    [Parameter(Mandatory=$true)]
    [string]$SourceImage
)

$outputDir = "j:\Bibliotheque2\frontend\assets"

Write-Host "Découpage des icônes..." -ForegroundColor Cyan

# Vérifier si ImageMagick est installé
if (!(Get-Command magick -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ImageMagick n'est pas installé" -ForegroundColor Red
    Write-Host "Télécharge depuis: https://imagemagick.org/script/download.php" -ForegroundColor Yellow
    Write-Host "Ou découpe manuellement l'image avec Paint/Photoshop" -ForegroundColor Yellow
    exit 1
}

# Découper l'image (dimensions approximatives, à ajuster selon l'image réelle)
$halfWidth = 512
$halfHeight = 512

# Icon (haut gauche)
magick $SourceImage -crop "${halfWidth}x${halfHeight}+0+0" -resize 1024x1024! "$outputDir\icon.png"

# Adaptive icon (haut droite)  
magick $SourceImage -crop "${halfWidth}x${halfHeight}+${halfWidth}+0" -resize 1024x1024! "$outputDir\adaptive-icon.png"

# Splash (bas gauche)
magick $SourceImage -crop "${halfWidth}x${halfHeight}+0+${halfHeight}" -resize 2048x2732! "$outputDir\splash.png"

# Favicon (bas droite)
magick $SourceImage -crop "${halfWidth}x${halfHeight}+${halfWidth}+${halfHeight}" -resize 48x48! "$outputDir\favicon.png"

Write-Host "✅ Icônes créées dans $outputDir" -ForegroundColor Green
ls "$outputDir\*.png"
