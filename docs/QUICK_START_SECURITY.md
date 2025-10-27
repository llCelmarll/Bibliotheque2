# 🚀 Guide de Démarrage - Sécurité et Utilisateurs

## 🎯 Objectif
Implémenter un système d'authentification et d'autorisation complet pour sécuriser l'application Bibliothèque2.

## 📋 Checklist de démarrage

### Phase 1 : Modèles et Base de données ✨

#### 1. Créer le modèle User
- [ ] `backend/app/models/User.py`
- [ ] `backend/app/models/UserRole.py` (enum)
- [ ] Migration automatique via SQLModel

#### 2. Créer les schémas d'authentification
- [ ] `backend/app/schemas/User.py`
- [ ] `UserCreate`, `UserRead`, `UserUpdate`
- [ ] `LoginRequest`, `TokenResponse`

#### 3. Dépendances sécurité
```bash
cd backend
pip install python-jose[cryptography] passlib[bcrypt] python-multipart
pip freeze > requirements.txt
```

### Phase 2 : Services d'authentification 🔐

#### 1. Service de hashage des mots de passe
- [ ] `backend/app/services/password_service.py`
- [ ] Hashage bcrypt sécurisé
- [ ] Vérification des mots de passe

#### 2. Service JWT
- [ ] `backend/app/services/jwt_service.py`
- [ ] Génération de tokens JWT
- [ ] Validation et décodage
- [ ] Refresh tokens

#### 3. Service utilisateur
- [ ] `backend/app/services/user_service.py`
- [ ] CRUD utilisateurs
- [ ] Authentification login/password
- [ ] Gestion des rôles

### Phase 3 : Endpoints API 🛡️

#### 1. Router d'authentification
- [ ] `backend/app/routers/auth.py`
- [ ] `POST /auth/register`
- [ ] `POST /auth/login`
- [ ] `POST /auth/refresh`
- [ ] `POST /auth/logout`

#### 2. Router utilisateurs
- [ ] `backend/app/routers/users.py`
- [ ] `GET /me` (profil utilisateur)
- [ ] `PUT /me` (modification profil)
- [ ] `GET /users` (liste - admin only)

#### 3. Middleware de sécurité
- [ ] `backend/app/middleware/auth_middleware.py`
- [ ] Vérification JWT automatique
- [ ] Injection user dans request.state

### Phase 4 : Protection des endpoints 🔒

#### 1. Décorateurs d'autorisation
- [ ] `@require_auth` - Utilisateur connecté
- [ ] `@require_role(UserRole.ADMIN)` - Rôle spécifique
- [ ] `@require_permission(Permission.BOOK_CREATE)` - Permission

#### 2. Sécuriser les endpoints livres
- [ ] `GET /books` - Accessible à tous (pour l'instant)
- [ ] `POST /books` - Require `BOOK_CREATE`
- [ ] `PUT /books/{id}` - Require `BOOK_UPDATE`
- [ ] `DELETE /books/{id}` - Require `BOOK_DELETE`

### Phase 5 : Frontend Authentication 📱

#### 1. Context d'authentification
- [ ] `frontend/contexts/AuthContext.tsx`
- [ ] State global utilisateur
- [ ] Fonctions login/logout
- [ ] Persistence du token

#### 2. Écrans d'authentification
- [ ] `frontend/app/(auth)/login.tsx`
- [ ] `frontend/app/(auth)/register.tsx`
- [ ] Formulaires avec validation

#### 3. Navigation protégée
- [ ] `frontend/components/ProtectedRoute.tsx`
- [ ] Redirection si non connecté
- [ ] Vérification des permissions

## 🛠️ Commandes de démarrage

### 1. Installation des dépendances
```bash
# Backend
cd backend
pip install python-jose[cryptography] passlib[bcrypt] python-multipart email-validator

# Frontend
cd frontend
npm install @react-native-async-storage/async-storage
```

### 2. Configuration des variables d'environnement
```bash
# backend/.env
SECRET_KEY=your-super-secret-jwt-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 3. Structure des fichiers à créer
```
backend/app/
├── models/
│   ├── User.py              ← À créer
│   └── UserRole.py          ← À créer
├── schemas/
│   └── User.py              ← À créer
├── services/
│   ├── password_service.py  ← À créer
│   ├── jwt_service.py       ← À créer
│   └── user_service.py      ← À créer
├── routers/
│   ├── auth.py              ← À créer
│   └── users.py             ← À créer
└── middleware/
    └── auth_middleware.py   ← À créer

frontend/
├── contexts/
│   └── AuthContext.tsx      ← À créer
├── app/(auth)/
│   ├── login.tsx            ← À créer
│   └── register.tsx         ← À créer
└── components/
    └── ProtectedRoute.tsx   ← À créer
```

## 🎯 Premier objectif : Authentification basique

Commençons par implémenter :
1. ✅ Modèle User avec rôles
2. ✅ Service de hashage des mots de passe  
3. ✅ Endpoints register/login
4. ✅ Écrans login/register frontend
5. ✅ Context d'authentification

**Prêt à commencer ? Par quel composant souhaitez-vous débuter ?** 🚀

## 💡 Notes importantes

- **Sécurité d'abord** : Toujours hasher les mots de passe
- **JWT sécurisé** : Utiliser une clé secrète forte et complexe
- **Validation stricte** : Valider tous les inputs utilisateur
- **Permissions granulaires** : Contrôler l'accès par rôle et permission
- **Tests complets** : Tester tous les scénarios d'authentification

Allons-y ! 🔐