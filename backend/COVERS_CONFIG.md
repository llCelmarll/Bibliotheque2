# Configuration Centralisée des Couvertures

## ✅ Implémentation Complétée

### Changements Effectués

#### 1. `.env.example` - Variable d'environnement
Ajout de la configuration `COVERS_DIR`:
```env
COVERS_DIR=./data/covers
```

#### 2. `app/config/__init__.py` - Configuration Centralisée
Nouveau module de configuration avec:
- **Détection automatique** Docker vs développement local
- **Variable d'environnement** `COVERS_DIR` avec valeur par défaut
- **Création automatique** du répertoire si nécessaire

```python
if os.path.exists("/.dockerenv") or os.getenv("DOCKER_CONTAINER"):
    COVERS_DIR = Path("/app/data/covers")  # Docker
else:
    covers_dir_str = os.getenv("COVERS_DIR", "./data/covers")
    COVERS_DIR = (backend_dir / covers_dir_str).resolve()
```

#### 3. `app/main.py` - Import depuis config
- ❌ **Supprimé**: Définition dupliquée de `COVERS_DIR`
- ✅ **Ajouté**: `from app.config import COVERS_DIR`
- ✅ **Nettoyé**: Suppression de `COVERS_DIR.mkdir()` (fait par config)

#### 4. `app/services/cover_service.py` - Import depuis config
- ❌ **Supprimé**: Définition dupliquée de `COVERS_DIR`
- ✅ **Ajouté**: `from app.config import COVERS_DIR`

### Avantages

1. **Une seule source de vérité** - Plus de duplication
2. **Configuration flexible** - Via variable d'environnement `.env`
3. **Détection automatique** - Docker vs développement local
4. **Création automatique** - Le répertoire est créé au démarrage

### Tests de Validation

```bash
# Configuration chargée correctement
✅ COVERS_DIR: J:\Bibliotheque2\backend\data\covers
✅ Directory exists: True
✅ No syntax errors
```

### Utilisation en Production (Docker)

Le fichier `docker-compose.yml` peut maintenant surcharger si nécessaire:
```yaml
environment:
  - COVERS_DIR=/app/data/covers  # Optionnel, détection auto suffit
```

### État du Système

- **Développement Local**: `J:\Bibliotheque2\backend\data\covers`
- **Docker**: `/app/data/covers` (détection automatique via `/.dockerenv`)
- **Source unique**: `app/config/__init__.py`
- **Modules utilisant**: `main.py`, `cover_service.py`
