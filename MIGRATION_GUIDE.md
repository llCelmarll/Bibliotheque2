# Guide de Migration - Indexation par Utilisateur

## 📋 Vue d'ensemble

Cette migration ajoute `owner_id` aux tables `authors`, `genres` et `publishers` pour isoler les données par utilisateur.

## ✅ Modifications apportées

### Base de données
- Migration Alembic : `a1b2c3d4e5f6_add_owner_id_to_authors_genres_publishers.py`
- Attribution intelligente des entités existantes aux bons utilisateurs
- Duplication des entités partagées entre plusieurs utilisateurs

### Backend
- Modèles mis à jour (Author, Genre, Publisher)
- Services mis à jour avec filtrage par `owner_id`
- Repositories mis à jour avec filtrage par `owner_id`
- Routers mis à jour avec authentification `get_current_user`
- Book service mis à jour pour passer `owner_id` aux repositories
- Tests backend : **87 tests passent**

### Frontend
- Tests corrigés : **43 tests passent**
- Pas de modification nécessaire côté code (l'API gère l'isolation)

## 🚀 Déploiement en production

### Préparation

Le Dockerfile a été modifié pour **lancer automatiquement les migrations Alembic** au démarrage du conteneur.

**Fichiers modifiés :**
- `backend/Dockerfile` : utilise maintenant `start.sh`
- `backend/start.sh` : lance `alembic upgrade head` puis démarre l'API

### Procédure de déploiement

```powershell
# Déployer avec le script habituel
./scripts/deploy/deploy-all.ps1

# Le script fait automatiquement :
# 1. Backup de la base de données
# 2. Build et push de l'image Docker
# 3. Redémarrage du conteneur
# 4. Les migrations Alembic s'exécutent au démarrage du conteneur
```

### Vérifications post-déploiement

#### 1. Vérifier les logs du conteneur

```powershell
ssh user@nas-ip
sudo docker logs mabibliotheque-backend --tail 50
```

Vous devriez voir :
```
🚀 Démarrage du backend MaBibliotheque...
📦 Application des migrations Alembic...
INFO  [alembic.runtime.migration] Running upgrade 54edcc49b969 -> a1b2c3d4e5f6
✅ Migrations appliquées avec succès
🌐 Démarrage de l'API FastAPI...
```

#### 2. Vérifier la structure de la base

```powershell
ssh user@nas-ip
sqlite3 /path/to/bibliotheque.db
```

```sql
-- Vérifier que owner_id existe
PRAGMA table_info(authors);
PRAGMA table_info(genres);
PRAGMA table_info(publishers);

-- Compter les entités par utilisateur
SELECT owner_id, COUNT(*) as count FROM authors GROUP BY owner_id;
SELECT owner_id, COUNT(*) as count FROM genres GROUP BY owner_id;
SELECT owner_id, COUNT(*) as count FROM publishers GROUP BY owner_id;
```

#### 3. Test fonctionnel

- Connectez-vous avec différents utilisateurs
- Vérifiez que chaque utilisateur voit uniquement ses propres auteurs/genres/éditeurs
- Testez la création d'un nouveau livre (auteur/genre/éditeur créés automatiquement pour l'utilisateur)

## 🔙 Backup et Rollback

### Backups automatiques

Les scripts de déploiement créent automatiquement un backup avant chaque déploiement :
```
backups/bibliotheque_YYYYMMDD_HHMMSS.db
```

### Rollback manuel (si nécessaire)

```powershell
ssh user@nas-ip

# Lister les backups disponibles
ls -lh /path/to/backups/

# Arrêter le conteneur
sudo docker stop mabibliotheque-backend

# Restaurer un backup
cp /path/to/backups/bibliotheque_YYYYMMDD_HHMMSS.db \
   /path/to/data/bibliotheque.db

# Redémarrer le conteneur
sudo docker start mabibliotheque-backend
```

### Rollback Alembic

```powershell
# Se connecter au conteneur
sudo docker exec -it mabibliotheque-backend bash

# Revenir à la version précédente
alembic downgrade -1
```

## 🧪 Tests locaux avant déploiement

### Backend
```powershell
cd backend
.venv\Scripts\python -m pytest tests/unit/ tests/integration/ -v
```
✅ Résultat attendu : **87 tests passent**

### Frontend
```powershell
cd frontend
npm test
```
✅ Résultat attendu : **43 tests passent**

## 📊 Résultats de migration (test local)

Migration testée sur base locale avec **2621 livres** :

- **Auteurs** : 717 → 1341 (dupliqués pour isolation)
- **Genres** : 55 genres répartis entre utilisateurs
- **Éditeurs** : 144 éditeurs répartis entre utilisateurs

## ⚠️ Points d'attention

1. **Isolation des données** : Chaque utilisateur voit uniquement ses propres entités
2. **Duplication** : Les entités partagées sont dupliquées pour chaque utilisateur
3. **Nouveaux auteurs** : Créés automatiquement et associés à l'utilisateur connecté
4. **Pas d'impact frontend** : L'API gère l'isolation transparente

## 📝 Fichiers modifiés

### Backend - Modèles
- `backend/app/models/Author.py`
- `backend/app/models/Genre.py`
- `backend/app/models/Publisher.py`

### Backend - Services
- `backend/app/services/author_service.py`
- `backend/app/services/genre_service.py`
- `backend/app/services/publisher_service.py`
- `backend/app/services/book_service.py`

### Backend - Repositories
- `backend/app/repositories/author_repository.py`
- `backend/app/repositories/genre_repository.py`
- `backend/app/repositories/publisher_repository.py`

### Backend - Routers
- `backend/app/routers/authors.py`
- `backend/app/routers/genres.py`
- `backend/app/routers/publishers.py`

### Backend - Tests
- `backend/tests/factories/book_factory.py`
- `backend/tests/unit/test_factories.py`

### Backend - Migration
- `backend/alembic/versions/a1b2c3d4e5f6_add_owner_id_to_authors_genres_publishers.py`

### Déploiement
- `backend/Dockerfile` (ajout migration automatique)
- `backend/start.sh` (nouveau script)

### Frontend
- `frontend/components/__tests__/StyledText-test.js` (correction async)

## ✅ Checklist de déploiement

- [x] Migration Alembic créée et testée
- [x] Backend adapté (87 tests)
- [x] Frontend testé (43 tests)
- [x] Dockerfile modifié pour migration auto
- [x] Script de démarrage créé
- [ ] Déploiement production
- [ ] Vérification logs migration
- [ ] Vérification structure BDD
- [ ] Test fonctionnel app déployée
