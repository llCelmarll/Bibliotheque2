# 🔐 Plan de Sécurité et Gestion des Utilisateurs

## 🎯 Objectifs de sécurité

### 1. Authentification
- [ ] JWT (JSON Web Tokens) pour l'authentification stateless
- [ ] Refresh tokens pour la gestion des sessions longues
- [ ] Hashage sécurisé des mots de passe (bcrypt)
- [ ] Validation des emails et force des mots de passe

### 2. Autorisation
- [ ] Système de rôles (Admin, Bibliothécaire, Lecteur)
- [ ] Permissions granulaires par ressource
- [ ] Middleware d'autorisation pour les endpoints
- [ ] Protection des routes sensibles

### 3. Sécurité des données
- [ ] Validation et sanitisation des entrées
- [ ] Protection contre l'injection SQL
- [ ] Chiffrement des données sensibles
- [ ] Audit trail des actions importantes

## 🏗️ Architecture proposée

### Backend - Modèles utilisateur

```python
# models/User.py
class User(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True)
    email: str = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True) 
    hashed_password: str
    first_name: str
    last_name: str
    is_active: bool = True
    is_verified: bool = False
    role: UserRole = UserRole.READER
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

# models/UserRole.py  
class UserRole(str, Enum):
    ADMIN = "admin"           # Tous les droits
    LIBRARIAN = "librarian"   # Gestion des livres, lectures  
    READER = "reader"         # Lecture seule, emprunts
```

### Système de permissions

```python
# models/Permission.py
class Permission(str, Enum):
    # Livres
    BOOK_CREATE = "book:create"
    BOOK_READ = "book:read" 
    BOOK_UPDATE = "book:update"
    BOOK_DELETE = "book:delete"
    
    # Utilisateurs
    USER_CREATE = "user:create"
    USER_READ = "user:read"
    USER_UPDATE = "user:update" 
    USER_DELETE = "user:delete"
    
    # Administration
    ADMIN_ACCESS = "admin:access"
    STATS_VIEW = "stats:view"

# Mapping rôles -> permissions
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [p for p in Permission],  # Toutes les permissions
    UserRole.LIBRARIAN: [
        Permission.BOOK_CREATE, Permission.BOOK_READ,
        Permission.BOOK_UPDATE, Permission.BOOK_DELETE,
        Permission.USER_READ, Permission.STATS_VIEW
    ],
    UserRole.READER: [
        Permission.BOOK_READ
    ]
}
```

## 🔑 Endpoints d'authentification

### Inscription et connexion
```python
POST /auth/register     # Inscription nouvel utilisateur
POST /auth/login       # Connexion (email + password)
POST /auth/refresh     # Renouvellement token JWT
POST /auth/logout      # Déconnexion (blacklist token)
POST /auth/verify      # Vérification email
POST /auth/reset-password  # Demande reset password
```

### Gestion du profil
```python
GET /me               # Profil utilisateur actuel
PUT /me               # Modification profil
POST /me/change-password  # Changement mot de passe
DELETE /me            # Suppression compte
```

### Administration (Admin/Librarian)
```python
GET /users            # Liste utilisateurs (paginée + filtres)
GET /users/{id}       # Détail utilisateur  
PUT /users/{id}       # Modification utilisateur
DELETE /users/{id}    # Suppression utilisateur
PUT /users/{id}/role  # Changement de rôle
PUT /users/{id}/status # Activation/désactivation
```

## 🛡️ Middleware de sécurité

### 1. Authentification JWT
```python
@app.middleware("http")
async def jwt_middleware(request: Request, call_next):
    # Vérification token JWT
    # Extraction utilisateur du token
    # Injection dans request.state.user
```

### 2. Autorisation par rôle
```python
def require_permission(permission: Permission):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Vérifier si l'utilisateur a la permission
            # Lever 403 si non autorisé
```

### 3. Rate limiting
```python
# Limitation des tentatives de connexion
# Protection contre les attaques par force brute
# Blacklist temporaire des IPs suspectes
```

## 📱 Frontend - Gestion utilisateur

### 1. Contexte d'authentification
```typescript
interface AuthContext {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
}
```

### 2. Écrans utilisateur
```
app/
  (auth)/
    login.tsx          # Écran de connexion
    register.tsx       # Écran d'inscription
    forgot-password.tsx # Mot de passe oublié
  (protected)/         # Routes protégées
    profile.tsx        # Profil utilisateur
    users/             # Gestion utilisateurs (admin)
      index.tsx        # Liste des utilisateurs
      [id].tsx         # Détail utilisateur
      create.tsx       # Créer utilisateur
```

### 3. Composants de sécurité
```typescript
// ProtectedRoute - Vérification authentification
// RoleGuard - Vérification permissions
// LoginForm - Formulaire de connexion
// RegistrationForm - Formulaire d'inscription
```

## 📋 Plan d'implémentation

### Phase 1 : Authentification de base
1. [ ] Modèles User et UserRole
2. [ ] Service d'authentification JWT  
3. [ ] Endpoints register/login/refresh
4. [ ] Middleware JWT
5. [ ] Contexte auth frontend
6. [ ] Écrans login/register

### Phase 2 : Autorisation avancée
1. [ ] Système de permissions
2. [ ] Middleware d'autorisation
3. [ ] Protection des endpoints livres
4. [ ] Composants ProtectedRoute
5. [ ] Interface d'administration

### Phase 3 : Sécurité renforcée  
1. [ ] Rate limiting
2. [ ] Audit logs
3. [ ] Validation avancée
4. [ ] Tests de sécurité
5. [ ] Documentation sécurité

## 🔧 Outils et dépendances

### Backend
```python
# Sécurité
python-jose[cryptography]  # JWT
passlib[bcrypt]           # Hash passwords
python-multipart          # Form data

# Validation  
email-validator           # Validation emails
```

### Frontend
```typescript
// State management
@react-native-async-storage/async-storage  // Token storage

// Navigation
expo-router  // Protected routes

// UI
react-native-paper  // Forms et composants UI
```

## 📊 Métriques de sécurité

- [ ] Temps de réponse des endpoints d'auth
- [ ] Nombre de tentatives de connexion échouées
- [ ] Utilisateurs actifs par période
- [ ] Actions par rôle utilisateur
- [ ] Détection d'anomalies de sécurité

Prêt à commencer l'implémentation ? Par quoi souhaitez-vous commencer ? 🚀