#!/usr/bin/env pwsh
param()

$Root = Split-Path $PSScriptRoot -Parent
$OutputFile = Join-Path $Root "secrets-backup.txt"

$EnvFiles = @(
    ".env",
    ".env.deploy",
    ".env.staging",
    ".env.synology",
    "backend\.env",
    "frontend\.env",
    "frontend\.env.production",
    "frontend\.env.local",
    "frontend-admin\.env.local"
)

$utf8 = New-Object System.Text.UTF8Encoding $false
$writer = [System.IO.StreamWriter]::new($OutputFile, $false, $utf8)

$writer.WriteLine("BIBLIOTHEQUE - SECRETS BACKUP")
$writer.WriteLine("Genere le : $(Get-Date -Format 'yyyy-MM-dd HH:mm')")
$writer.WriteLine("=" * 60)
$writer.WriteLine("")

foreach ($rel in $EnvFiles) {
    $path = Join-Path $Root $rel
    if (Test-Path $path) {
        $writer.WriteLine("### $rel ###")
        foreach ($line in [System.IO.File]::ReadAllLines($path, $utf8)) {
            $writer.WriteLine($line)
        }
        $writer.WriteLine("")
    }
}

$writer.Close()

Write-Host ""
Write-Host "Fichier genere : $OutputFile" -ForegroundColor Green
Write-Host ""
Write-Host "ETAPES :" -ForegroundColor Yellow
Write-Host "  1. Ouvrir Bitwarden -> Nouvelle note securisee 'Bibliotheque Secrets'" -ForegroundColor White
Write-Host "  2. Copier le contenu de secrets-backup.txt dans la note" -ForegroundColor White
Write-Host "  3. Supprimer secrets-backup.txt immediatement apres" -ForegroundColor White
Write-Host ""

Start-Process notepad $OutputFile