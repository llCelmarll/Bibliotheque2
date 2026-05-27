# Tests de performance Locust - Ma Bibliotheque
# Usage:
#   .\scripts\tests\run_perf_tests.ps1                       # scenario par defaut (book_crud)
#   .\scripts\tests\run_perf_tests.ps1 -Scenario mixed_workflow
#   .\scripts\tests\run_perf_tests.ps1 -Scenario book_crud -Users 20 -Time 3m
#   .\scripts\tests\run_perf_tests.ps1 -UI                   # interface web Locust

param(
    [ValidateSet("auth", "book_crud", "mixed_workflow")]
    [string]$Scenario = "book_crud",
    [int]$Users = 0,
    [string]$Time = "",
    [switch]$UI,
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"

function Write-Success { param($Message) Write-Host "[OK]    $Message" -ForegroundColor Green }
function Write-Info    { param($Message) Write-Host "[INFO]  $Message" -ForegroundColor Cyan }
function Write-Warn    { param($Message) Write-Host "[WARN]  $Message" -ForegroundColor Yellow }
function Write-Err     { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Step    { param($Message) Write-Host "" ; Write-Host "--- $Message" -ForegroundColor Magenta }

$RootDir    = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$BackendDir = Join-Path $RootDir "backend"
$VenvPython = Join-Path $RootDir ".venv\Scripts\python.exe"
$VenvPip    = Join-Path $RootDir ".venv\Scripts\pip.exe"
$EnvFile    = Join-Path $BackendDir ".env"
$PerfScript = "tests/performance/run_performance_tests.py"
$ApiUrl     = "http://localhost:8000"

Write-Host ""
Write-Host "======================================" -ForegroundColor Magenta
Write-Host "  Tests de performance - Bibliotheque" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta
Write-Host "  Scenario : $Scenario"
if ($UI) {
    Write-Host "  Mode     : Interface web (localhost:8089)"
} else {
    Write-Host "  Mode     : Headless"
}
Write-Host ""

# 1. Verifier le venv

Write-Step "Environnement Python"

if (-not (Test-Path $VenvPython)) {
    Write-Err "Environnement virtuel introuvable : $VenvPython"
    Write-Err "Creez-le avec : python -m venv .venv"
    exit 1
}
Write-Success "Venv trouve"

# 2. Verifier / installer Locust

$locustCheck = & $VenvPip show locust 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Locust non installe. Installation depuis requirements-dev.txt..."
    $reqFile = Join-Path $BackendDir "requirements-dev.txt"
    & $VenvPip install -r $reqFile | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Echec installation. Lancez manuellement : pip install -r requirements-dev.txt"
        exit 1
    }
    Write-Success "Locust installe"
} else {
    $locustVersion = ($locustCheck | Select-String "^Version").ToString().Split(":")[1].Trim()
    Write-Success "Locust $locustVersion"
}

# 3. Charger les variables d'environnement

Write-Step "Variables d'environnement"

if (-not (Test-Path $EnvFile)) {
    Write-Err "Fichier .env introuvable : $EnvFile"
    exit 1
}

Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
}
$env:PYTHONPATH       = $BackendDir
$env:PYTHONIOENCODING = "utf-8"
Write-Success ".env charge"

# 4. Verifier / demarrer le backend

Write-Step "Backend"

$backendRunning = $false
try {
    $resp = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 3 -ErrorAction Stop
    if ($resp.status -eq "ok") { $backendRunning = $true }
} catch {}

if ($backendRunning) {
    Write-Success "Backend deja actif sur $ApiUrl"
} elseif ($NoStart) {
    Write-Err "Backend inaccessible sur $ApiUrl"
    Write-Err "Demarrez-le avec : .\backend\start-backend-local.ps1"
    exit 1
} else {
    Write-Info "Backend non detecte, demarrage en arriere-plan..."

    $startArgs = "-m uvicorn app.main:app --host 0.0.0.0 --port 8000"
    $proc = Start-Process -FilePath $VenvPython `
        -ArgumentList $startArgs `
        -WorkingDirectory $BackendDir `
        -PassThru -WindowStyle Hidden

    $waited = 0
    while ($waited -lt 15) {
        Start-Sleep -Seconds 1
        $waited++
        try {
            $resp = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 2 -ErrorAction Stop
            if ($resp.status -eq "ok") { break }
        } catch {}
    }

    try {
        Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 2 -ErrorAction Stop | Out-Null
        Write-Success "Backend demarre (PID $($proc.Id))"
    } catch {
        Write-Err "Le backend ne repond pas apres 15s"
        exit 1
    }
}

# 5. Lancer Locust

Write-Step "Locust"

$locustArgs = @($PerfScript, $Scenario)
if ($Users -gt 0) { $locustArgs += @("--users", $Users) }
if ($Time -ne "")  { $locustArgs += @("--time", $Time) }
if ($UI)           { $locustArgs += "--ui" }

$locustCmd = $locustArgs -join " "
Write-Info "Commande : python $locustCmd"
if ($UI) { Write-Info "Interface web : http://localhost:8089" }
Write-Host ""

Push-Location $BackendDir
try {
    & $VenvPython @locustArgs
    $exitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

# 6. Resume

Write-Host ""
Write-Host "======================================" -ForegroundColor Magenta

$resultsDir = Join-Path $BackendDir "tests\performance\results"
$latestCsv  = Get-ChildItem -Path $resultsDir -Filter "${Scenario}_*_stats.csv" -ErrorAction SilentlyContinue |
              Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($exitCode -eq 0) {
    Write-Success "Tests termines"
    if ($latestCsv) {
        Write-Info "Resultats : $($latestCsv.FullName)"

        $csv = Import-Csv $latestCsv.FullName
        $agg = $csv | Where-Object { $_.Name -eq "Aggregated" }
        $rows = $csv | Where-Object { $_.Name -ne "Aggregated" }

        if ($agg -and $rows) {
            Write-Host ""
            Write-Host "  Resume :" -ForegroundColor Cyan
            Write-Host ("  {0,-44} {1,8} {2,8} {3,8} {4,10}" -f "Endpoint", "Med(ms)", "P95(ms)", "P99(ms)", "Erreurs")
            Write-Host ("  " + ("-" * 82))
            foreach ($row in $rows) {
                $name = "$($row.Type) $($row.Name)"
                if ($name.Length -gt 44) { $name = $name.Substring(0, 41) + "..." }
                $failures = "$($row."Failure Count")/$($row."Request Count")"
                Write-Host ("  {0,-44} {1,8} {2,8} {3,8} {4,10}" -f
                    $name,
                    [math]::Round([double]$row."50%"),
                    [math]::Round([double]$row."95%"),
                    [math]::Round([double]$row."99%"),
                    $failures)
            }
            Write-Host ("  " + ("-" * 82))
            Write-Host ("  {0,-44} {1,8} {2,8} {3,8}" -f
                "TOTAL",
                [math]::Round([double]$agg."50%"),
                [math]::Round([double]$agg."95%"),
                [math]::Round([double]$agg."99%")) -ForegroundColor Cyan
        }
    }
} else {
    Write-Err "Les tests ont rencontre des erreurs (code $exitCode)"
}

Write-Host ""
