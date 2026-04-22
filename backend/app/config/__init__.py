# Configuration module
import os
from pathlib import Path

# Configuration centralisée du répertoire des couvertures
# Détection automatique: Docker vs développement local
if os.path.exists("/.dockerenv") or os.getenv("DOCKER_CONTAINER"):
    # En Docker, utiliser le chemin absolu
    COVERS_DIR = Path("/app/data/covers")
else:
    # En développement local, utiliser le chemin depuis .env ou valeur par défaut
    covers_dir_str = os.getenv("COVERS_DIR", "./data/covers")
    # Résoudre le chemin relatif à partir du dossier backend
    backend_dir = Path(__file__).parent.parent.parent
    COVERS_DIR = (backend_dir / covers_dir_str).resolve()

# S'assurer que le répertoire existe
COVERS_DIR.mkdir(parents=True, exist_ok=True)

# URL de base de l'application (pour les liens absolus dans l'export CSV)
# DOMAIN_NAME peut être "mabibliotheque.ovh", "staging.mabibliotheque.ovh" ou "localhost:8000"
_domain = os.getenv("DOMAIN_NAME", "localhost:8000")
_scheme = "http" if _domain.startswith("localhost") else "https"
APP_BASE_URL = os.getenv("APP_BASE_URL", f"{_scheme}://{_domain}")
