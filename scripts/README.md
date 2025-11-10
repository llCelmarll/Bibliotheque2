# 📜 Scripts de Gestion du Projet

Scripts pour le développement local, le déploiement et la configuration de l'application Bibliothèque.

---

## 🏠 Développement Local

### 📦 Configuration Initiale

```powershell
# 1. Configurer l'environnement (première fois seulement)
.\scripts\setup-env.ps1

# 2. Éditer les fichiers .env avec vos valeurs
# - .env
# - backend/.env  
# - frontend/.env
```

### 🚀 Lancer l'Application

```powershell
# Mode production (Docker)
.\scripts\local\start.ps1

# Mode développement (Hot-reload)
.\scripts\local\dev.ps1
```

**Accès :**
- 📱 Frontend : http://localhost:8081
- 🔧 Backend API : http://localhost:8000
- 📚 Documentation API : http://localhost:8000/docs

### 🛑 Arrêter l'Application

```powershell
.\scripts\local\stop.ps1
```

---

## 🌐 Déploiement en Production

### 🏗️ Déploiement Complet (Web + Mobile + APK)

```powershell
.\scripts\deploy\deploy-all.ps1
```

**Options :**
```powershell
# Sauter le déploiement web
.\scripts\deploy\deploy-all.ps1 -SkipWeb

# Sauter la mise à jour OTA mobile
.\scripts\deploy\deploy-all.ps1 -SkipMobile

# Personnaliser le message de mise à jour
.\scripts\deploy\deploy-all.ps1 -UpdateMessage "Correction bugs import CSV"
```

### 🔄 Redéploiement Rapide du Frontend

```powershell
.\scripts\deploy\redeploy-frontend.ps1
```

### 🏠 Déploiement sur Synology NAS

```powershell
.\scripts\deploy\deploy-synology.ps1
```

---

## 🛠️ Utilitaires

### 🔑 Génération de Clé Secrète

```powershell
.\scripts\generate-secret-key.ps1
```

### 🧪 Test Docker

```powershell
.\scripts\test-docker.ps1
```

### 🧹 Nettoyage

```powershell
# Nettoyer l'historique des fichiers .env
.\scripts\clean-env-history.ps1
```

---

## 📁 Structure des Scripts

```
scripts/
├── README.md                    # Ce fichier
├── setup-env.ps1               # Configuration initiale (recommandé)
├── setup-env-simple.ps1        # Configuration simple
├── generate-secret-key.ps1     # Générateur de clé
├── test-docker.ps1             # Test Docker
├── clean-env-history.ps1       # Nettoyage
├── local/                      # Développement local
│   ├── start.ps1              # Démarrer en mode production
│   ├── dev.ps1                # Démarrer en mode dev (hot-reload)
│   └── stop.ps1               # Arrêter l'application
└── deploy/                     # Déploiement production
    ├── deploy-all.ps1         # Déploiement complet (backend + frontend + mobile)
    ├── deploy-synology.ps1    # Alias vers deploy-all.ps1
    ├── redeploy-backend.ps1   # Redéploiement backend uniquement
    └── redeploy-frontend.ps1  # Redéploiement frontend uniquement
```

---

## 📦 Détails des Scripts de Déploiement

### `deploy-all.ps1` - Déploiement Complet

Déploie **backend + frontend web + mobile** en une seule commande.

```powershell
# Déploiement complet
.\scripts\deploy\deploy-all.ps1

# Déploiement sélectif
.\scripts\deploy\deploy-all.ps1 -SkipBackend   # Sans le backend
.\scripts\deploy\deploy-all.ps1 -SkipWeb       # Sans le frontend web
.\scripts\deploy\deploy-all.ps1 -SkipMobile    # Sans la mise à jour mobile OTA
.\scripts\deploy\deploy-all.ps1 -SkipApk       # Sans la configuration APK

# Message personnalisé pour la mise à jour mobile
.\scripts\deploy\deploy-all.ps1 -UpdateMessage "Correction bugs critiques"
```

**Étapes du déploiement :**
1. **Backend** : Build multi-arch (AMD64 + ARM64) → Push sur Docker Hub → Disponible pour NAS
2. **Frontend Web** : Build multi-arch → Push Docker Hub → Redéploiement SSH sur NAS
3. **Mobile OTA** : Publication EAS update (branch: preview) → Apps mobiles mises à jour automatiquement
4. **APK** : Configuration nginx pour téléchargement APK Android

**Prérequis :**
- Docker Hub : `docker login` avec compte `llcelmarll`
- SSH NAS : Accès `admin@192.168.1.100` (clé SSH recommandée)
- EAS CLI : `eas login` avec compte Expo

### `redeploy-backend.ps1` - Backend Uniquement

Redémarre le container backend sur le NAS avec la dernière image.

```powershell
.\scripts\deploy\redeploy-backend.ps1
```

**Utile pour :**
- Déploiement rapide après un fix backend
- Mise à jour de l'API sans toucher au frontend
- Tests de nouvelles fonctionnalités backend en production

### `redeploy-frontend.ps1` - Frontend Uniquement

Redémarre le container frontend sur le NAS avec la dernière image.

```powershell
.\scripts\deploy\redeploy-frontend.ps1
```

**Utile pour :**
- Déploiement rapide après un fix UI
- Mise à jour du frontend web sans toucher au backend
- Tests de nouvelles fonctionnalités frontend en production

---

## ⚙️ Variables d'Environnement

### Backend (.env et backend/.env)

```bash
# Base de données
DATABASE_URL=sqlite:///./data/bibliotheque.db

# Sécurité
SECRET_KEY=votre_cle_secrete_generee   # Utiliser generate-secret-key.ps1
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:8081,http://localhost:3000
```

### Frontend (frontend/.env)

```bash
# URL de l'API
EXPO_PUBLIC_API_URL=http://localhost:8000  # Local
# EXPO_PUBLIC_API_URL=https://mabibliotheque.ovh/api  # Production
```

---

## 🔄 Workflow Typique

### Développement

```powershell
# 1. Première installation
.\scripts\setup-env.ps1
# Éditer les .env avec vos valeurs

# 2. Lancer en mode développement
.\scripts\local\dev.ps1

# 3. Développer avec hot-reload...

# 4. Arrêter
Ctrl+C ou .\scripts\local\stop.ps1
```

### Mise en Production

```powershell
# 1. Tester localement
.\scripts\local\start.ps1

# 2. Vérifier que tout fonctionne
# http://localhost:8081 et http://localhost:8000/docs

# 3. Déployer
.\scripts\deploy\deploy-all.ps1 -UpdateMessage "Nouvelle fonctionnalité X"

# 4. Vérifier la prod
# https://mabibliotheque.ovh
```

---

## 🆘 Troubleshooting

### Docker n'est pas installé
```powershell
# Installer Docker Desktop depuis docker.com
# Redémarrer PowerShell après installation
```

### Erreur de permissions Docker
```powershell
# Ajouter votre utilisateur au groupe docker (Linux)
sudo usermod -aG docker $USER

# Redémarrer Docker Desktop (Windows)
```

### Ports déjà utilisés
```powershell
# Vérifier les processus sur les ports
netstat -ano | findstr ":8000"
netstat -ano | findstr ":8081"

# Tuer le processus si nécessaire
taskkill /PID <PID> /F
```

### Base de données corrompue
```powershell
# Sauvegarder l'ancienne
Copy-Item backend/data/bibliotheque.db backend/data/bibliotheque.db.bak

# Recréer une nouvelle (toutes les données seront perdues)
Remove-Item backend/data/bibliotheque.db

# Redémarrer l'application
.\scripts\local\start.ps1
```

---

## 📝 Notes

- **Sécurité** : Ne jamais commiter les fichiers `.env`
- **Backup** : Sauvegarder régulièrement `backend/data/bibliotheque.db`
- **Docker** : Les scripts nécessitent Docker Desktop installé et lancé
- **Ports** : Par défaut 8000 (backend) et 8081 (frontend)
