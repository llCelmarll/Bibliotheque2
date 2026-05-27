# Tests de performance — Ma Bibliothèque

Documentation des tests de charge Locust : comment les lancer, interpréter les résultats, et les résultats de référence (baseline).

---

## Prérequis

Les dépendances de développement incluent Locust :

```powershell
# Depuis backend/
pip install -r requirements-dev.txt
```

Le backend local doit tourner sur `http://localhost:8000`. Pour le démarrer :

```powershell
# Depuis backend/ — charge les variables du .env local
.\start-backend-local.ps1
```

La base de données PostgreSQL locale doit être active :

```powershell
docker-compose up -d postgres
```

---

## Lancer un test

Tous les tests se lancent depuis le dossier `backend/` via le script de lancement :

```powershell
# Depuis backend/
python tests/performance/run_performance_tests.py <scenario>
```

### Scénarios disponibles

| Scénario | Description | Utilisateurs | Durée |
|---|---|---|---|
| `auth` | Login / register | 5 | 1 min |
| `book_crud` | Liste, création, détail, mise à jour, recherche | 10 | 2 min |
| `mixed_workflow` | Workflow réaliste : auth + livres + scan ISBN | 15 | 3 min |

### Options

```powershell
# Lister les scénarios
python tests/performance/run_performance_tests.py --list

# Surcharger le nombre d'utilisateurs ou la durée
python tests/performance/run_performance_tests.py book_crud --users 20 --time 3m

# Ouvrir l'interface web Locust (http://localhost:8089)
python tests/performance/run_performance_tests.py --ui book_crud

# Cibler un autre serveur (staging, prod)
python tests/performance/run_performance_tests.py book_crud --host https://api.mabibliotheque.ovh
```

### Résultats CSV

Les résultats sont écrits dans `backend/tests/performance/results/` avec un nom horodaté :

```
results/book_crud_20260527_180000_stats.csv
results/book_crud_20260527_180000_failures.csv
```

Ce dossier est ignoré par git (`.gitignore`).

---

## Structure des fichiers

```
backend/tests/performance/
├── locustfile.py              # Point d'entrée Locust (importe tous les scénarios)
├── run_performance_tests.py   # Script de lancement
├── base_user.py               # Classe de base : authentification, création de livre
├── test_auth_performance.py   # Scénario auth
├── test_book_performance.py   # Scénario CRUD livres
├── test_mixed_workflow.py     # Scénario mixte
├── test_scan_performance.py   # Scénario scan ISBN
└── results/                   # CSV de résultats (ignorés par git)
```

---

## Résultats de référence (baseline)

Mesure effectuée le 2026-05-27 sur machine locale (Windows 11, PostgreSQL Docker, données de développement).

**Conditions :** 10 utilisateurs simultanés, spawn rate 2/s, durée 2 min, scénario `book_crud`.

| Endpoint | Médiane | P95 | P99 | Erreurs |
|---|---|---|---|---|
| `POST /auth/login` | 180 ms | 330 ms | 360 ms | 0 % |
| `POST /auth/register` | 190 ms | 2400 ms | 2500 ms | 0 % |
| `POST /books` (création) | 24 ms | 200 ms | 330 ms | 0 % |
| `GET /books/{id}` | 12 ms | 15 ms | 15 ms | 0 % |
| `PUT /books/{id}` | 20 ms | 20 ms | 20 ms | 0 % |
| `POST /books/search/simple` | 47 ms | 250 ms | 390 ms | 0 % |
| `POST /books/search/simple?q=*` | 10–130 ms | 330–680 ms | variable | 0 % |

**Note sur le register :** le P95 à 2400 ms est dû à bcrypt (`work_factor=12`) — intentionnel, rend le brute-force coûteux. Ce n'est pas un goulot d'étranglement à corriger.

**Cible de performance :** lecture et recherche < 300 ms au P95. Tous les endpoints y sont conformes sur machine locale.

---

## Optimisations appliquées (2026-05-27)

Avant le baseline ci-dessus, les points suivants ont été corrigés :

- **N+1 supprimé** : `book_repository.py` — suppression des `selectinload` imbriqués sur `Author.books` et `Genre.books` dans `get_by_id`, `get_by_isbn`, `get_by_isbn_or_barcode`. Chaque appel générait N requêtes supplémentaires pour charger la bibliothèque complète de chaque auteur/genre du livre.
- **GROUP BY allégé** : `_deduplicate_and_sort` — réduit de 14 colonnes à `Book.id` seul. PostgreSQL autorise cela car toutes les colonnes de `books` sont fonctionnellement dépendantes de la clé primaire.
- **Index composites ajoutés** (migration `a2b3c4d5e6f7`) :
  - `books(owner_id, is_read)` — filtre is_read toujours scopé à un propriétaire
  - `books(owner_id, created_at)` — tri par date dans les listings
  - `borrowed_books(book_id, status)` — sous-requêtes statut dans `search_books`

---

## Interpréter les résultats

Les colonnes clés du CSV `_stats.csv` :

| Colonne | Signification |
|---|---|
| `Median Response Time` | P50 — 50 % des requêtes sont en dessous |
| `95%` | P95 — seuil à surveiller pour la majorité des utilisateurs |
| `99%` | P99 — cas extrêmes |
| `Failure Count` | Nombre de requêtes en erreur |
| `Requests/s` | Débit moyen |

Un P95 > 1000 ms sur un endpoint de lecture est un signal d'alerte. Le register est l'exception (bcrypt).
