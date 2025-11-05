# Script pour mettre a jour l'URL de l'APK dans nginx et deployer automatiquement
# Usage: .\update-apk-url.ps1 [ApkId]
# 
# Sans parametre: Recupere automatiquement le dernier build Android depuis EAS
# Avec parametre: Utilise l'ID APK specifie
#
# Exemple: .\update-apk-url.ps1
# Exemple: .\update-apk-url.ps1 oJGWpnV1j1Yr7KJcapRs4L

param(
    [string]$ApkId = "",
    [switch]$NoDeploy,
    [switch]$RebuildAPK
)

Write-Host "`nMise a jour automatique de l'APK Android" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Si aucun ApkId n'est fourni, publier une mise a jour OTA ou rebuilder l'APK
if ([string]::IsNullOrEmpty($ApkId)) {
    
    if ($RebuildAPK) {
        # Mode rebuild complet de l'APK (pour changements natifs)
        Write-Host "Creation d'un nouveau build Android sur EAS..." -ForegroundColor Yellow
        Write-Host ""
        
        # Lancer le build APK sur EAS
        Write-Host "Lancement du build (cela peut prendre plusieurs minutes)..." -ForegroundColor Cyan
        $buildResult = eas build --platform android --profile production --non-interactive --json 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erreur lors du lancement du build EAS" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Build lance avec succes !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Attente de la fin du build..." -ForegroundColor Yellow
    Write-Host "(Vous pouvez suivre la progression sur https://expo.dev)" -ForegroundColor Gray
    Write-Host ""
    
    # Attendre que le build soit termine
    $maxAttempts = 60  # 30 minutes max (30 secondes * 60)
    $attempt = 0
    $buildComplete = $false
    
    while (-not $buildComplete -and $attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 30
        $attempt++
        
        Write-Host "Verification du statut du build... (tentative $attempt/$maxAttempts)" -ForegroundColor Gray
        
        try {
            $buildOutput = eas build:list --platform android --limit 1 --json --non-interactive 2>&1
            $buildInfo = $buildOutput | ConvertFrom-Json
            
            if (-not $buildInfo -or $buildInfo.Count -eq 0) {
                continue
            }
            
            $latestBuild = $buildInfo[0]
            
            if ($latestBuild.status -eq "FINISHED") {
                $apkUrl = $latestBuild.artifacts.applicationArchiveUrl
                
                if ($apkUrl) {
                    $buildComplete = $true
                    
                    # Extraire l'ID de l'APK depuis l'URL
                    if ($apkUrl -match '/artifacts/eas/([^/]+)\.apk') {
                        $ApkId = $matches[1]
                        
                        Write-Host ""
                        Write-Host "Build termine avec succes !" -ForegroundColor Green
                        Write-Host "  Build ID: $($latestBuild.id)" -ForegroundColor Gray
                        Write-Host "  APK ID: $ApkId" -ForegroundColor Gray
                        Write-Host "  Version: $($latestBuild.appVersion)" -ForegroundColor Gray
                        Write-Host "  Runtime: $($latestBuild.runtimeVersion)" -ForegroundColor Gray
                        Write-Host ""
                    } else {
                        Write-Host "Impossible d'extraire l'ID de l'APK depuis l'URL" -ForegroundColor Red
                        Write-Host "  URL: $apkUrl" -ForegroundColor Gray
                        exit 1
                    }
                }
            } elseif ($latestBuild.status -eq "ERRORED" -or $latestBuild.status -eq "CANCELED") {
                Write-Host ""
                Write-Host "Le build a echoue ou a ete annule" -ForegroundColor Red
                Write-Host "  Status: $($latestBuild.status)" -ForegroundColor Gray
                exit 1
            }
        }
        catch {
            # Continuer d'attendre en cas d'erreur temporaire
            continue
        }
    }
    
    if (-not $buildComplete) {
        Write-Host ""
        Write-Host "Timeout: Le build n'est pas termine apres 30 minutes" -ForegroundColor Red
        Write-Host "Verifiez le statut sur https://expo.dev" -ForegroundColor Yellow
        exit 1
    }
    } else {
        # Mode OTA update (par defaut) - beaucoup plus rapide !
        Write-Host "Publication d'une mise a jour OTA sur EAS..." -ForegroundColor Yellow
        Write-Host ""
        
        # Publier la mise a jour OTA
        Write-Host "Publication en cours..." -ForegroundColor Cyan
        eas update --branch production --message "Update via script automatique" --non-interactive
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Erreur lors de la publication de la mise a jour OTA" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "Mise a jour OTA publiee avec succes !" -ForegroundColor Green
        Write-Host ""
        Write-Host "Recuperation du dernier APK build..." -ForegroundColor Yellow
        
        # Recuperer le dernier APK build existant
        try {
            $buildOutput = eas build:list --platform android --limit 1 --json --non-interactive 2>&1
            $buildInfo = $buildOutput | ConvertFrom-Json
            
            if (-not $buildInfo -or $buildInfo.Count -eq 0) {
                Write-Host "Aucun build APK trouve" -ForegroundColor Red
                Write-Host "Utilisez -RebuildAPK pour creer un nouveau build" -ForegroundColor Yellow
                exit 1
            }
            
            $latestBuild = $buildInfo[0]
            
            # Essayer differentes facons d'acceder a l'URL de l'APK
            $apkUrl = $null
            if ($latestBuild.artifacts -and $latestBuild.artifacts.applicationArchiveUrl) {
                $apkUrl = $latestBuild.artifacts.applicationArchiveUrl
            } elseif ($latestBuild.artifacts -and $latestBuild.artifacts.buildUrl) {
                $apkUrl = $latestBuild.artifacts.buildUrl
            }
            
            if (-not $apkUrl -or $latestBuild.status -ne "FINISHED") {
                Write-Host "Dernier build APK:" -ForegroundColor Yellow
                Write-Host "  Build ID: $($latestBuild.id)" -ForegroundColor Gray
                Write-Host "  Status: $($latestBuild.status)" -ForegroundColor Gray
                Write-Host "  Date: $($latestBuild.createdAt)" -ForegroundColor Gray
                Write-Host ""
                
                if ($latestBuild.status -ne "FINISHED") {
                    Write-Host "Le dernier build n'est pas termine" -ForegroundColor Red
                    Write-Host "Utilisez -RebuildAPK pour creer un nouveau build" -ForegroundColor Yellow
                } else {
                    Write-Host "Pas d'URL d'APK disponible pour ce build" -ForegroundColor Red
                    Write-Host "Utilisez -RebuildAPK pour creer un nouveau build" -ForegroundColor Yellow
                }
                exit 1
            }
            
            # Extraire l'ID de l'APK depuis l'URL
            if ($apkUrl -match '/artifacts/eas/([^/]+)\.apk') {
                $ApkId = $matches[1]
                
                Write-Host ""
                Write-Host "APK existant recupere:" -ForegroundColor Green
                Write-Host "  Build ID: $($latestBuild.id)" -ForegroundColor Gray
                Write-Host "  APK ID: $ApkId" -ForegroundColor Gray
                Write-Host "  Version: $($latestBuild.appVersion)" -ForegroundColor Gray
                Write-Host ""
                Write-Host "Note: L'APK reste le meme, seul le code JS/TS est mis a jour via OTA" -ForegroundColor Cyan
                Write-Host ""
            } else {
                Write-Host "Impossible d'extraire l'ID de l'APK depuis l'URL" -ForegroundColor Red
                exit 1
            }
        }
        catch {
            Write-Host "Erreur lors de la recuperation de l'APK" -ForegroundColor Red
            Write-Host "  $($_.Exception.Message)" -ForegroundColor Gray
            exit 1
        }
    }
}

$NEW_URL = "https://expo.dev/artifacts/eas/$ApkId.apk"

# Mise a jour de nginx-frontend.conf
Write-Host "Mise a jour de la configuration nginx..." -ForegroundColor Yellow
$configPath = "nginx-frontend.conf"
$content = Get-Content $configPath -Raw

# Remplacer l'ancienne URL par la nouvelle
$pattern = 'return 302 https://expo\.dev/artifacts/eas/[^;]+\.apk;'
$replacement = "return 302 $NEW_URL;"

if ($content -match $pattern) {
    $newContent = $content -replace $pattern, $replacement
    Set-Content -Path $configPath -Value $newContent
    
    Write-Host "nginx-frontend.conf mis a jour" -ForegroundColor Green
    Write-Host "  Nouvelle URL: $NEW_URL" -ForegroundColor Gray
    Write-Host ""
    
    # Mise a jour de deploy-all.ps1
    $deployPath = "..\deploy-all.ps1"
    $deployContent = Get-Content $deployPath -Raw
    $deployPattern = 'URL EAS: https://expo\.dev/artifacts/eas/[^"]+\.apk'
    $deployReplacement = "URL EAS: $NEW_URL"
    
    if ($deployContent -match $deployPattern) {
        $newDeployContent = $deployContent -replace $deployPattern, $deployReplacement
        Set-Content -Path $deployPath -Value $newDeployContent
        Write-Host "deploy-all.ps1 mis a jour" -ForegroundColor Green
        Write-Host ""
    }
} else {
    Write-Host "Pattern non trouve dans nginx-frontend.conf" -ForegroundColor Red
    Write-Host "  Verifiez le fichier manuellement" -ForegroundColor Yellow
    exit 1
}

# Si -NoDeploy n'est pas specifie, deployer automatiquement
if (-not $NoDeploy) {
    Write-Host "Deploiement automatique..." -ForegroundColor Yellow
    Write-Host ""
    
    # Commit et push
    Write-Host "[1/3] Commit des modifications..." -ForegroundColor Cyan
    Set-Location ..
    git add frontend/nginx-frontend.conf deploy-all.ps1
    git commit -m "Update APK URL to $ApkId"
    git push
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erreur lors du commit/push" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Modifications commitees et pushees" -ForegroundColor Green
    Write-Host ""
    
    # Deploiement
    Write-Host "[2/3] Deploiement sur le NAS..." -ForegroundColor Cyan
    .\deploy-all.ps1 -SkipMobile
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erreur lors du deploiement" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "[3/3] Verification de la redirection..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3
    
    try {
        $response = Invoke-WebRequest -Uri "https://mabibliotheque.ovh/bibliotheque.apk" -Method Head -MaximumRedirection 0 -ErrorAction SilentlyContinue
        $location = $response.Headers.Location
        
        if ($location -eq $NEW_URL) {
            Write-Host "Redirection APK active et correcte !" -ForegroundColor Green
        } else {
            Write-Host "Redirection active mais URL differente:" -ForegroundColor Yellow
            Write-Host "  Attendu: $NEW_URL" -ForegroundColor Gray
            Write-Host "  Obtenu: $location" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "Impossible de verifier la redirection" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Mise a jour terminee avec succes !" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Lien APK: https://mabibliotheque.ovh/bibliotheque.apk" -ForegroundColor Cyan
    Write-Host "Pointe vers: $NEW_URL" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "Pour appliquer les changements:" -ForegroundColor Yellow
    Write-Host "  1. Commit et push les modifications" -ForegroundColor White
    Write-Host "  2. Deployer: ..\deploy-all.ps1 -SkipMobile" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou relancez sans -NoDeploy pour deployer automatiquement" -ForegroundColor Cyan
    Write-Host ""
}
