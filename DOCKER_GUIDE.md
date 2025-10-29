# 🐳 Guide Docker - Application Bibliothèque

## 📋 Prérequis
- Docker Desktop installé et configuré
- Docker Compose (inclus avec Docker Desktop)
- 4 GB de RAM disponible minimum
- Ports 80, 8000, 8081 disponibles

## 🚀 Démarrage Rapide

### Option 1: Script automatique (Recommandé)
```powershell
# Démarrage production
.\scripts\start.ps1

# Démarrage développement (avec hot-reload)
.\scripts\dev.ps1

# Arrêt de l'application
.\scripts\stop.ps1
```

### Option 2: Commandes manuelles
```bash
# Construction et démarrage
docker-compose up --build -d

# Voir les logs
docker-compose logs -f

# Arrêt
docker-compose down
```

## 🏗️ Architecture des Services

### 🔧 Backend (Port 8000)
- **Framework**: FastAPI + Python 3.11
- **Base de données**: SQLite avec volumes persistants
- **Features**: API REST, Documentation automatique
- **Health Check**: http://localhost:8000/health

### 📱 Frontend (Port 8081)
- **Framework**: React Native + Expo Web
- **Build**: Node.js 18 Alpine
- **Features**: Interface utilisateur, connexion API

### 🌐 Nginx (Port 80)
- **Reverse Proxy**: Routage intelligent
- **CORS**: Configuration automatique
- **Load Balancing**: Distribution des requêtes

## 📁 Structure des Fichiers Docker

```
Bibliotheque2/
├── docker-compose.yml          # Configuration principale
├── .env                        # Variables d'environnement
├── backend/
│   ├── Dockerfile             # Image backend Python
│   └── .dockerignore          # Fichiers exclus
├── frontend/
│   ├── Dockerfile             # Image frontend Node.js
│   └── .dockerignore          # Fichiers exclus
├── docker/
│   └── nginx/
│       └── nginx.conf         # Configuration proxy
└── scripts/
    ├── start.ps1              # Script de démarrage
    ├── stop.ps1               # Script d'arrêt
    └── dev.ps1                # Mode développement
```

## 🔄 Volumes et Persistance

### Volumes Docker
- `bibliotheque_data`: Base de données SQLite persistante
- `./backend:/app`: Code backend (dev uniquement)
- `./frontend:/app`: Code frontend (dev uniquement)

### Réseaux
- `bibliotheque_network`: Communication inter-services

## 🌍 URLs d'Accès

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:8081 | Application React Native Web |
| Backend API | http://localhost:8000 | API REST FastAPI |
| Documentation | http://localhost:8000/docs | Swagger UI automatique |
| Nginx Proxy | http://localhost | Accès via reverse proxy |

## 🛠️ Commandes Utiles

### Gestion des Services
```bash
# Voir le statut
docker-compose ps

# Logs en temps réel
docker-compose logs -f [service]

# Redémarrer un service
docker-compose restart [service]

# Reconstruire une image
docker-compose build [service]
```

### Debugging
```bash
# Accéder au conteneur backend
docker-compose exec backend bash

# Accéder au conteneur frontend
docker-compose exec frontend sh

# Voir les ressources utilisées
docker stats
```

### Nettoyage
```bash
# Arrêt avec suppression des volumes
docker-compose down -v

# Nettoyage complet du système Docker
docker system prune -a
```

## 🔧 Configuration Avancée

### Variables d'Environnement (.env)
```env
# Backend
DATABASE_URL=sqlite:///./data/bibliotheque.db
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Frontend
EXPO_PUBLIC_API_URL=http://localhost:8000

# Docker
COMPOSE_PROJECT_NAME=bibliotheque
DOCKER_BUILDKIT=1
```

### Mode Développement
Le fichier `docker-compose.dev.yml` est généré automatiquement avec:
- Hot-reload activé
- Volumes de code montés
- Variables d'environnement de développement

## 📊 Monitoring et Health Checks

### Health Checks Configurés
- **Backend**: Endpoint `/health` vérifié toutes les 30s
- **Retry Logic**: 3 tentatives avec timeout de 10s

### Logs Centralisés
```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

## 🚨 Dépannage

### Problèmes Courants

1. **Port déjà utilisé**
   ```bash
   # Changer les ports dans docker-compose.yml
   ports:
     - "8001:8000"  # Au lieu de 8000:8000
   ```

2. **Problème de permissions**
   ```bash
   # Linux/Mac uniquement
   sudo chown -R $USER:$USER .
   ```

3. **Cache Docker**
   ```bash
   # Reconstruction forcée sans cache
   docker-compose build --no-cache
   ```

4. **Base de données corrompue**
   ```bash
   # Supprimer le volume et redémarrer
   docker-compose down -v
   docker-compose up --build
   ```

### Vérification de l'Installation
```bash
# Tester les endpoints
curl http://localhost:8000/health
curl http://localhost:8000/docs
curl http://localhost:8081
```

## 🔐 Sécurité

### En Développement
- Ports exposés uniquement en local
- Pas de HTTPS (utiliser localhost)
- Variables d'environnement par défaut

### En Production
- Changer toutes les clés secrètes
- Configurer HTTPS avec certificats SSL
- Utiliser des secrets Docker
- Configurer un firewall

## 📈 Performance

### Optimisations Incluses
- Images Alpine Linux (plus légères)
- Build multi-stage pour réduire la taille
- Cache des dépendances npm/pip
- Volumes optimisés

### Recommandations
- Allouer au moins 4GB RAM à Docker
- SSD recommandé pour les volumes
- Surveiller l'utilisation avec `docker stats`

---

*Documentation générée automatiquement - Dernière mise à jour: $(Get-Date)*