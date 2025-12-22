for ($i=1; $i -le 5; $i++) {
    Write-Host "`n=== RUN $i ===" -ForegroundColor Yellow
    npm test 2>&1 | Select-String "FAIL|Tests:"
    Start-Sleep -Milliseconds 200
}
