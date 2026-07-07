# Backend — API Bibliothèque2

API REST construite avec FastAPI, SQLModel (SQLAlchemy) et PostgreSQL.

## Démarrage rapide

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- Documentation interactive (Swagger) : http://localhost:8000/docs
- ReDoc : http://localhost:8000/redoc

Ces deux routes sont désactivées automatiquement quand `ENV=production` — c'est la référence à jour pour l'exploration des endpoints, plus fiable qu'une liste statique sur un projet à 20+ routers.

Nécessite une base PostgreSQL et un fichier `.env` (voir `.env.example`) — `DATABASE_URL` est obligatoire. Les migrations Alembic s'appliquent automatiquement au démarrage.

## Organisation

Voir [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) pour la vue d'ensemble (couches, domaines fonctionnels, intégrations externes).

```
app/
├── main.py         # assemblage FastAPI, middlewares, routers
├── db.py            # moteur SQLAlchemy, init DB
├── routers/          # endpoints — un fichier par domaine
├── services/         # logique métier
├── repositories/      # accès aux données
├── models/           # tables SQLModel
├── schemas/          # contrats Pydantic (entrée/sortie API)
├── clients/          # Google Books, OpenLibrary
├── config/           # whitelist, constantes
└── admin/            # setup sqladmin (optionnel, SQLADMIN_ENABLED=true)
```

## Authentification

La plupart des endpoints (livres, contacts, prêts, comptes...) nécessitent un JWT :

```bash
# Obtenir un token
curl -X POST http://localhost:8000/auth/login-json \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Utiliser le token
curl http://localhost:8000/books \
  -H "Authorization: Bearer <token>"
```

Détails : [SECURITY.md](SECURITY.md).

## Gestion d'entités flexible (livres)

Les endpoints de création/modification de livres acceptent plusieurs formats pour les entités liées (auteurs, éditeur, genres), afin d'éviter un aller-retour "créer l'auteur, puis créer le livre" côté client :

```json
// Par ID (entité existante)
{ "title": "Sapiens", "authors": [1, 2], "publisher": 3, "genres": [4, 5] }

// Par objet (création automatique si nouveau)
{ "title": "Sapiens", "authors": [{"name": "Yuval Noah Harari"}], "publisher": {"name": "Harper"} }

// Mixte
{ "authors": [1, {"name": "Nouvel Auteur"}] }
```

Même logique pour le champ `contact` en création de prêt (`POST /loans`) : ID, nom (création auto), ou objet complet.

## Tests

```bash
pytest tests/
pytest -m loans -v          # tests marqués par domaine
pytest --cov=app             # avec coverage
```

Tests de performance (Locust) : [docs/PERFORMANCE_TESTS.md](../docs/PERFORMANCE_TESTS.md).

## Étendre l'API

1. Modèle dans `app/models/` (table SQLModel) + migration Alembic (`alembic revision --autogenerate`)
2. Schéma Pydantic dans `app/schemas/`
3. Logique métier dans `app/services/`
4. Endpoint dans `app/routers/`, puis `app.include_router(...)` dans `main.py`

Si le schéma de données change, régénérer les diagrammes : voir [docs/schema_bdd.md](../docs/schema_bdd.md).
