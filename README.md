# 📚 Bibliothèque2 - Système de Gestion de Bibliothèque

## 🎯 Vue d'ensemble

Bibliothèque2 est une application moderne de gestion de bibliothèque développée avec FastAPI (backend) et React Native/Expo (frontend). Le système permet la gestion complète des livres avec scan de codes-barres, recherche avancée, et gestion des entités (auteurs, éditeurs, genres).

## ✨ Fonctionnalités principales

### 📖 Gestion des livres
- **Scan de codes-barres** - Ajout rapide via scan ISBN/barcode
- **Recherche intelligente** - APIs Google Books et Open Library
- **CRUD complet** - Création, lecture, modification, suppression
- **Gestion d'entités flexible** - Auteurs, éditeurs, genres avec création automatique

### 🔍 Recherche et filtrage  
- **Recherche textuelle** - Par titre, auteur, ISBN
- **Filtres avancés** - Par genre, éditeur, année de publication
- **Pagination** - Navigation optimisée des résultats
- **Tri personnalisable** - Par titre, auteur, date de publication

### 📱 Interface utilisateur
- **Design responsive** - Optimisé mobile et web
- **Navigation intuitive** - Stack navigation avec Expo Router
- **Composants réutilisables** - Architecture modulaire
- **Feedback utilisateur** - Messages de confirmation et d'erreur

## 🏗️ Architecture technique

### Backend - FastAPI + SQLModel
```
backend/
├── app/
│   ├── main.py              # Point d'entrée de l'application
│   ├── database.py          # Configuration base de données  
│   ├── models/              # Modèles SQLModel
│   │   ├── Book.py
│   │   ├── Author.py
│   │   ├── Publisher.py
│   │   └── Genre.py
│   ├── schemas/             # Schémas Pydantic
│   │   └── Book.py
│   ├── services/            # Logique métier
│   │   └── book_service.py
│   ├── repositories/        # Accès aux données
│   │   └── book_repository.py
│   ├── routers/             # Endpoints API
│   │   └── books.py
│   └── external/            # APIs externes
│       ├── google_books.py
│       └── openlibrary.py
```

### Frontend - React Native + Expo
```
frontend/
├── app/                     # Pages avec Expo Router
│   ├── (tabs)/
│   │   ├── books/           # Gestion des livres
│   │   └── scan/            # Scan de codes-barres
├── components/              # Composants réutilisables
│   ├── BookDetail/
│   ├── EntitySelectors/
│   └── BookForm/            # Formulaire universel de livre
├── services/                # Services API
│   └── bookService.ts
├── types/                   # Types TypeScript
│   ├── book.ts
│   └── scanTypes.ts
└── hooks/                   # Hooks personnalisés
    └── useBookDetail.ts
```

## 🚀 Installation et démarrage rapide

### Prérequis
- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (pour le déploiement)
- PowerShell (Windows)

### Quick Start (Recommandé)

Le projet utilise un script PowerShell centralisé pour toutes les opérations :

```powershell
# Configuration initiale (première fois uniquement)
.\run.ps1 setup

# Développement local
.\run.ps1 dev          # Démarre backend + frontend en mode dev
.\run.ps1 start        # Démarre avec Docker (mode production local)
.\run.ps1 stop         # Arrête tous les conteneurs

# Déploiement
.\run.ps1 deploy       # Déploie sur Synology NAS (backend + web + mobile)
.\run.ps1 deploy-backend # Met à jour uniquement le backend
.\run.ps1 deploy-web   # Met à jour uniquement le frontend web
.\run.ps1 deploy-mobile # Publie une mise à jour mobile (EAS)

# Aide et documentation
.\run.ps1 help         # Affiche toutes les commandes disponibles
```

⚠️ **Avant le premier déploiement**, consultez [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md) pour configurer Docker Hub, SSH et EAS CLI.

### Installation manuelle (alternative)

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Frontend  
```bash
cd frontend
npm install
npm start
```

Pour plus de détails sur les scripts de développement et déploiement, consultez [scripts/README.md](scripts/README.md).

## 📊 Base de données

### Modèle relationnel
```sql
-- Table principale des livres
Book (id, title, isbn, published_date, page_count, barcode, cover_url, publisher_id)

-- Tables d'entités
Author (id, name)
Publisher (id, name)  
Genre (id, name)

-- Tables de liaison (many-to-many)
book_authors (book_id, author_id)
book_genres (book_id, genre_id)
```

### Migrations
Les migrations sont gérées automatiquement via SQLModel et SQLAlchemy.

## 🔧 Configuration

### Variables d'environnement (backend)
```env
DATABASE_URL=sqlite:///./bibliotheque.db
GOOGLE_BOOKS_API_KEY=your_api_key_here
```

### Configuration API (frontend)
```typescript
// config/api.ts
const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
  ENDPOINTS: {
    BOOKS: '/books',
    SCAN: '/scan'
  }
};
```

## 📚 Documentation API

### Endpoints principaux

#### Livres
- `GET /books` - Liste paginée avec recherche et filtres
- `GET /books/{id}` - Détail d'un livre avec relations
- `POST /books` - Création d'un livre (avec gestion d'entités flexible)
- `PUT /books/{id}` - Modification d'un livre (même flexibilité que création)
- `DELETE /books/{id}` - Suppression d'un livre

#### Scan et recherche
- `GET /scan/{barcode}` - Informations livre par code-barres/ISBN
- `GET /books/search` - Recherche avancée avec filtres

### Gestion d'entités intelligente

Les endpoints de création et modification supportent plusieurs formats :

**Format avec IDs (entités existantes) :**
```json
{
  "title": "Sapiens",
  "authors": [1, 2],
  "publisher": 3,
  "genres": [4, 5]
}
```

**Format avec objets (création automatique) :**
```json
{
  "title": "Sapiens", 
  "authors": [{"name": "Yuval Noah Harari"}],
  "publisher": {"name": "Harper"},
  "genres": [{"name": "Histoire"}]
}
```

**Format mixte (supporté) :**
```json
{
  "authors": [1, {"name": "Nouvel Auteur"}],
  "genres": [4, {"name": "Nouveau Genre"}]
}
```

## 🧪 Tests

### Backend
```bash
cd backend
pytest tests/
```

### Frontend
```bash
cd frontend  
npm test
```

## 📈 Performance

- **Cache intelligent** - Mise en cache des réponses APIs externes
- **Pagination optimisée** - Chargement progressif des données
- **Lazy loading** - Chargement à la demande des détails
- **Debouncing** - Optimisation des recherches temps réel

## 🔐 Sécurité (à venir)

Le projet intégrera prochainement :
- Authentification JWT
- Système de rôles et permissions
- Validation et sanitisation des entrées
- Rate limiting et protection CSRF

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🏃‍♂️ Prochaines étapes

Voir [SECURITY_PLAN.md](docs/SECURITY_PLAN.md) pour le plan d'implémentation de la sécurité et gestion des utilisateurs.

---

**Développé avec ❤️ en FastAPI et React Native/Expo**