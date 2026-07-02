# Plan de test de charge — Production

> Valider que l'infra NAS Synology (PostgreSQL 16, Docker, Cloudflare) tient 10–50 utilisateurs simultanés.
> Baseline locale : P95=280ms sur `/books/search/simple` à 10 users — objectif : tenir sous 300ms en prod à 50 users.

---

## Contexte

La baseline de performance a été mesurée sur machine locale (`http://localhost:8000`). Ce test vise à valider le comportement sur la chaîne complète : machine locale → Cloudflare → Livebox NAT → NAS Synology → Docker → FastAPI + PostgreSQL 16.

Framework : Locust (déjà en place dans `backend/tests/performance/`).

---

## Prérequis

- Locust installé localement : `pip install -r backend/requirements-dev.txt`
- Accès SSH ou DSM Terminal sur le NAS
- 50 comptes de test pré-provisionnés dans la base de prod (voir SQL ci-dessous)
- Rate limiter vidé avant le test

**Pourquoi des comptes pré-provisionnés ?**
En prod, `EMAIL_VERIFICATION_ENABLED=true`. Le flow normal de `base_user.py` (`/auth/register` → récupérer le token) retourne `access_token: ""` tant que l'email n'est pas vérifié. Il faut donc créer les users directement en base avec `email_verified_at` renseigné, puis se connecter via `/auth/login`.

---

## Étape 1 — Provisionnement des comptes de test

Sur le NAS (SSH ou DSM Terminal → Docker → mabibliotheque-postgres) :

```bash
docker exec -it mabibliotheque-postgres psql -U bibliotheque -d bibliotheque
```

Générer d'abord le hash bcrypt sur la machine locale :

```bash
# Dans backend/
python -c "import bcrypt; print(bcrypt.hashpw(b'TestPass1', bcrypt.gensalt()).decode())"
```

Copier le hash, puis exécuter en psql :

```sql
-- Whitelist le domaine de test
INSERT INTO whitelist_entries (email, added_at)
SELECT 'perf_test_' || i || '@perftest.local', now()
FROM generate_series(1,50) AS i ON CONFLICT DO NOTHING;

-- Créer 50 utilisateurs pré-vérifiés (remplacer <HASH> par le hash généré ci-dessus)
INSERT INTO users (email, username, hashed_password, role, is_active, email_verified_at, created_at)
SELECT
  'perf_test_' || i || '@perftest.local',
  'perf_user_' || i,
  '<BCRYPT_HASH_ICI>',
  'user', true, now(), now()
FROM generate_series(1,50) AS i ON CONFLICT (email) DO NOTHING;

-- Vider le rate limiter avant de lancer le test
DELETE FROM rate_limit_attempts;
```

Vérification :

```sql
SELECT count(*) FROM users WHERE email LIKE 'perf_test_%'; -- doit retourner 50
```

---

## Étape 2 — Monitoring NAS (ouvrir avant de lancer)

```bash
# Statistiques containers toutes les 5 secondes
watch -n 5 "docker stats --no-stream mabibliotheque-backend mabibliotheque-postgres"

# Logs d'erreurs en temps réel (dans un 2ème terminal)
docker logs -f mabibliotheque-backend 2>&1 | grep -E "ERROR|WARNING|429|500"

# Connexions PostgreSQL actives (noter au départ, au milieu, à la fin)
docker exec mabibliotheque-postgres psql -U bibliotheque -d bibliotheque \
  -c "SELECT count(*) FROM pg_stat_activity WHERE datname='bibliotheque';"
```

---

## Étape 3 — Lancer les tests

Le backend est derrière Nginx qui route `/api/*` → FastAPI. Utiliser `--host https://mabibliotheque.ovh/api`.

> **Note :** Le `base_user.py` existant appelle `/auth/register` au démarrage. Pour ce test, modifier temporairement `on_start()` dans `base_user.py` pour utiliser `/auth/login` avec les comptes pré-provisionnés, ou lancer Locust directement avec un fichier dédié.

```powershell
# Depuis backend/

# Phase 1 — Warmup : 10 users, 3 min, interface web pour observer en direct
python -m locust -f tests/performance/locustfile.py `
  --host https://mabibliotheque.ovh/api `
  --users 10 --spawn-rate 2 --run-time 3m

# Interface web disponible sur http://localhost:8089

# Phase 2 — Test principal : 50 users, 5 min, headless, CSV auto-sauvegardé
python tests/performance/run_performance_tests.py mixed_workflow `
  --host https://mabibliotheque.ovh/api `
  --users 50 --time 5m
```

Résultats CSV sauvegardés automatiquement dans `backend/tests/performance/results/`.

---

## Métriques cibles

| Endpoint | P95 cible | Seuil rouge |
|---|---|---|
| `POST /books/search/simple` | < 300 ms | > 600 ms |
| `GET /books/{id}` | < 100 ms | > 300 ms |
| `POST /auth/login` | < 800 ms | > 2000 ms |
| `POST /books` | < 400 ms | > 1000 ms |
| `GET /scan/{isbn}` | < 2000 ms | > 5000 ms |
| Taux d'erreur global | < 1% | > 2% |

**Guide d'interprétation :**
- P95 `/books/search/simple` > 600ms → suspect N+1 ou saturation connection pool → vérifier `pg_stat_activity`
- P95 `/auth/login` > 2000ms à 50 users → saturation CPU du NAS (bcrypt est CPU-bound)
- Erreurs HTTP 429 → rate limiter déclenché malgré le nettoyage → réduire spawn rate
- Erreurs HTTP 500 → crash backend → inspecter `docker logs mabibliotheque-backend`
- Scan P95 > 5000ms → latence API externe Google Books, acceptable tant que taux d'erreur < 5%

---

## Tableau de résultats *(à remplir après le test)*

### Métriques API

| Endpoint | P50 | P95 | P99 | RPS | Erreurs | Cible OK ? |
|---|---|---|---|---|---|---|
| POST /auth/login | | | | | | < 800ms P95 |
| POST /books/search/simple | | | | | | < 300ms P95 |
| GET /books/{id} | | | | | | < 100ms P95 |
| POST /books | | | | | | < 400ms P95 |
| GET /scan/{isbn} | | | | | | < 2000ms P95 |

### Ressources NAS

| Ressource | Au repos | Pic pendant test | Acceptable ? |
|---|---|---|---|
| Backend CPU % | | | < 80% |
| PostgreSQL CPU % | | | < 80% |
| Backend RAM (MB) | | | |
| Connexions PG actives | | | < 20 |

### Fichier CSV généré

`backend/tests/performance/results/mixed_workflow_<TIMESTAMP>_stats.csv`

---

## Étape 4 — Nettoyage post-test

```sql
-- Sur le NAS (psql dans mabibliotheque-postgres)
DELETE FROM books WHERE owner_id IN (
  SELECT id FROM users WHERE email LIKE 'perf_test_%@perftest.local');
DELETE FROM users WHERE email LIKE 'perf_test_%@perftest.local';
DELETE FROM whitelist_entries WHERE email LIKE 'perf_test_%@perftest.local';
DELETE FROM rate_limit_attempts;

-- Vérification
SELECT count(*) FROM users WHERE email LIKE 'perf_test_%'; -- doit retourner 0
```

---

## Résultats et conclusion *(à compléter après le test)*

Date du test :
Durée :
Version backend :

Conclusion :
