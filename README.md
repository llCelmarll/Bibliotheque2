# 📚 Bibliothèque2

Application de gestion de bibliothèque personnelle, en production sur [mabibliotheque.ovh](https://mabibliotheque.ovh) — mobile (iOS/Android via Expo), web, et panneau d'administration dédié.

Gestion complète du catalogue (scan ISBN, auto-complétion Google Books/OpenLibrary, import/export CSV), prêts entre utilisateurs, réseau de contacts, notifications push, modération et conformité RGPD (CGU versionnées, export/suppression de données).

## Stack technique

| | |
|---|---|
| **Backend** | FastAPI · SQLModel/SQLAlchemy · Alembic · PostgreSQL 16 |
| **Mobile / Web** | React Native · Expo (Router) · TypeScript |
| **Admin** | React · Vite · TanStack Query · Tailwind |
| **Auth** | JWT + refresh token, bcrypt, whitelist d'inscription, rate limiting |
| **Déploiement** | Docker (images Docker Hub) → Synology NAS via SSH, EAS pour le mobile |

Détails, choix techniques et diagrammes : voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Fonctionnalités principales

- **Catalogue** — ajout manuel ou par scan de code-barres (auto-complétion via Google Books et OpenLibrary combinés), import/export CSV en masse avec détection d'encodage et mapping de colonnes, gestion flexible des auteurs/éditeurs/genres/séries (création automatique à la volée), statut de lecture, notation, couvertures.
- **Prêts** — deux mécanismes complémentaires : suivi manuel d'un prêt consenti à un contact, et demandes d'emprunt entre utilisateurs de l'app (avec acceptation/refus), rappels automatiques 48h avant échéance, intégration calendrier.
- **Réseau & contacts** — invitations entre utilisateurs, partage de bibliothèque, fiches contact libres ou liées à un compte réel.
- **Comptes & sécurité** — inscription par whitelist, vérification d'email, réinitialisation de mot de passe, CGU versionnées avec re-consentement, suppression de compte complète (RGPD).
- **Notifications push** — Expo push, préférences par type d'événement.
- **Administration** — panneau séparé (`frontend-admin/`) pour la modération (signalements, audit log), la gestion des utilisateurs, de la whitelist et de la liste d'attente.

Historique détaillé des versions : [docs/CHANGELOG.json](docs/CHANGELOG.json) (affiché dans l'app) — voir aussi [docs/ROADMAP.md](docs/ROADMAP.md) et [docs/ROADMAP_PUBLICATION.md](docs/ROADMAP_PUBLICATION.md).

## Démarrage rapide

### Prérequis
- Python 3.11+, Node.js 18+
- Docker & Docker Compose
- PowerShell (les scripts de dev/déploiement sont en `.ps1`)

### Développement local

Un script centralise les opérations courantes :

```powershell
.\run.ps1 setup   # configuration initiale (une seule fois)
.\run.ps1 dev      # backend + frontend en mode dev (hot-reload)
.\run.ps1 start    # via Docker (mode proche production)
.\run.ps1 stop
.\run.ps1 help     # liste complète des commandes
```

`setup` génère les fichiers `.env` à partir des `.env.example` — éditez-les avant de démarrer.

### Installation manuelle (alternative)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# Documentation interactive : http://localhost:8000/docs

# Frontend mobile/web
cd frontend
npm install
npm start

# Panneau admin
cd frontend-admin
npm install
npm run dev
```

### Déploiement

```powershell
.\run.ps1 deploy          # backend + web + mobile (Synology NAS)
.\run.ps1 deploy-backend  # backend uniquement
.\run.ps1 deploy-web      # frontend web uniquement
.\run.ps1 deploy-mobile   # mise à jour OTA mobile (EAS)
```

Détails d'infrastructure (Docker Hub, SSH, EAS CLI) : [scripts/README.md](scripts/README.md).

## Base de données

Schéma PostgreSQL généré depuis les modèles SQLModel réels, avec vues par thème (catalogue, utilisateurs, emprunts, contacts, modération, notifications) et les règles métier non visibles dans un simple diagramme de colonnes :

👉 [docs/schema_bdd.md](docs/schema_bdd.md)

## Tests

```bash
cd backend && pytest tests/
cd frontend && npm test
```

Tests de performance (Locust) : [docs/PERFORMANCE_TESTS.md](docs/PERFORMANCE_TESTS.md).

## Sécurité

JWT + refresh token, bcrypt, whitelist d'inscription (table admin, repli `.env`), rate limiting anti brute-force persistant, validation stricte des entrées, headers de sécurité HTTP (CSP, HSTS, X-Frame-Options), CGU/RGPD. Détails : [backend/SECURITY.md](backend/SECURITY.md).
