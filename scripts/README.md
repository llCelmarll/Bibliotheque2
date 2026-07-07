# Scripts de gestion du projet

Toutes les opérations courantes passent par `run.ps1` à la racine (`.\run.ps1 help` pour la liste complète). Ce dossier contient les scripts qu'il invoque, plus quelques utilitaires ponctuels.

## Développement local

Voir [local/README.md](local/README.md) — `run.ps1 dev` / `start` / `stop`, prérequis, URLs des trois services (API, frontend web, admin).

## Déploiement

```powershell
.\run.ps1 deploy           # backend + web + mobile (Synology NAS)
.\run.ps1 deploy-backend   # backend uniquement
.\run.ps1 deploy-web       # frontend web uniquement
.\run.ps1 deploy-mobile    # mise à jour OTA mobile (EAS)
```

| Script | Rôle |
|---|---|
| `deploy/deploy-all.ps1` | Déploiement complet avec détection automatique des changements (compare la branche courante à `prod`) |
| `deploy/deploy-synology.ps1` | Setup initial complet sur le NAS (PostgreSQL + backend + frontend), distinct de `deploy-all.ps1` |
| `deploy/redeploy-backend.ps1` | Backend uniquement, avec backup PostgreSQL automatique avant redéploiement |
| `deploy/redeploy-frontend.ps1` | Frontend web uniquement |
| `deploy/redeploy-admin.ps1` | Panneau d'administration (`frontend-admin/`) uniquement |
| `deploy/update-apk.ps1` | Télécharge le dernier build EAS et l'héberge sur le NAS (voir [deploy/README-APK.md](deploy/README-APK.md)) |
| `deploy/bump-version.ps1` | Incrémente la version affichée dans l'app (patch/minor/major) — met à jour `frontend/app.config.js` et `docs/CHANGELOG.json` |

**Prérequis déploiement :**
- Docker Hub : `docker login`
- SSH vers le NAS (clé SSH recommandée) — voir [docs/PRODUCTION_SETUP.md](../docs/PRODUCTION_SETUP.md)
- EAS CLI : `eas login` (compte Expo)

### Staging

`deploy/staging/` contient les équivalents pour l'environnement de staging (`deploy-all-staging.ps1`, `redeploy-staging-backend.ps1`, etc.) — voir [docs/STAGING_SETUP.md](../docs/STAGING_SETUP.md).

## Utilitaires

| Script | Rôle |
|---|---|
| `setup-env.ps1` | Configuration initiale des fichiers `.env` (racine, backend, frontend) — recommandé |
| `setup-env-simple.ps1` | Variante simplifiée |
| `generate-secret-key.ps1` | Génère une clé pour `SECRET_KEY` |
| `export-secrets.ps1` | Exporte les secrets vers le format attendu par l'environnement cible |
| `clean-env-history.ps1` | Nettoie l'historique Git des fichiers `.env` committés par erreur |
| `start-dev-mobile.ps1` | Démarre Expo en mode dev pour le mobile (tunnel/LAN) |
| `start.sh` | Point d'entrée du conteneur backend en production (utilisé par le `Dockerfile`) |
| `gen_schema_diagram.py` | Régénère les diagrammes ER (`docs/schema_bdd.md` + `docs/schemas/*.md`) depuis les modèles SQLModel — voir [docs/schema_bdd.md](../docs/schema_bdd.md) |

## Variables d'environnement

Le projet utilise PostgreSQL (pas SQLite) — voir `.env.example` à la racine et dans `backend/` pour la liste complète. Points clés :

```bash
# backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/bibliotheque
SECRET_KEY=...              # généré via generate-secret-key.ps1
ALLOWED_EMAILS=...          # whitelist d'inscription (repli si la table whitelist_entries est vide)

# frontend/.env
EXPO_PUBLIC_API_URL=http://localhost:8000   # local
```

## Dépannage

**Port déjà utilisé (8000, 8081, 3001)**
```powershell
netstat -ano | findstr ":8000"
taskkill /PID <PID> /F
```

**Docker ne démarre pas** — vérifier que Docker Desktop est lancé, puis `docker-compose up -d postgres`.

**Base de données locale désynchronisée du code** — voir [docs/schema_bdd.md](../docs/schema_bdd.md) pour comparer le schéma réel aux modèles ; les migrations Alembic s'appliquent automatiquement au démarrage du backend.
