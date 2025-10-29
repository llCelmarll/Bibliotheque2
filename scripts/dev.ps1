# Script PowerShell pour le développement avec hot-reload
# Usage: .\scripts\dev.ps1

Write-Host "🚀 Démarrage en mode développement..." -ForegroundColor Green

# Créer un docker-compose override pour le développement
$devCompose = @"
version: '3.8'

services:
  backend:
    volumes:
      - ./backend:/app
    environment:
      - RELOAD=true
    command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

  frontend:
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - EXPO_PUBLIC_API_URL=http://localhost:8000
    command: ["npm", "run", "start"]
    stdin_open: true
    tty: true
"@

$devCompose | Out-File -FilePath "docker-compose.dev.yml" -Encoding UTF8

# Démarrer en mode développement
Write-Host "🔨 Construction et démarrage des services en mode dev..." -ForegroundColor Yellow
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

Write-Host "✅ Mode développement arrêté!" -ForegroundColor Green