..\.venv\Scripts\activate

# Charger les variables depuis .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
}

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
