# Scripts de développement local

| Script | Commande | Description |
|---|---|---|
| `dev.ps1` | `.\run.ps1 dev` | Mode dev avec hot-reload : PostgreSQL via Docker, backend/frontend/admin en natif dans des fenêtres séparées |
| `start.ps1` | `.\run.ps1 start` | Mode production local : tout via Docker Compose |
| `stop.ps1` | `.\run.ps1 stop` | Arrête les conteneurs Docker |

## Prérequis

- Docker Desktop en cours d'exécution
- `.venv` à la racine du projet (`python -m venv .venv && .venv\Scripts\pip install -r backend\requirements.txt`)
- `npm install` dans `frontend/` et `frontend-admin/`

## URLs en mode dev

| Service | URL |
|---|---|
| API (FastAPI) | http://localhost:8000 |
| Frontend (Expo Web) | http://localhost:8081 |
| Admin (Vite) | http://localhost:3001 |
