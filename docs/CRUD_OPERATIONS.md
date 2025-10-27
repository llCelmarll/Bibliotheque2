# 📖 Opérations CRUD - Gestion des Livres

## Vue d'ensemble

Le système de gestion des livres supporte maintenant toutes les opérations CRUD (Create, Read, Update, Delete) avec une gestion intelligente des entités (auteurs, éditeurs, genres).

## 🆕 Création de livres

### Endpoint: `POST /books`

La création de livres supporte deux formats pour les entités :

**Format avec IDs (entités existantes) :**
```json
{
  "title": "Sapiens",
  "isbn": "9780062316097",
  "authors": [1, 2], 
  "publisher": 3,
  "genres": [4, 5]
}
```

**Format avec objets (création automatique) :**
```json
{
  "title": "Sapiens",
  "isbn": "9780062316097",
  "authors": [{"name": "Yuval Noah Harari"}],
  "publisher": {"name": "Harper"},
  "genres": [{"name": "Histoire"}, {"name": "Science"}]
}
```

**Format mixte (supporté) :**
```json
{
  "title": "Sapiens",
  "isbn": "9780062316097",
  "authors": [1, {"name": "Nouvel Auteur"}], // ID existant + nouvel auteur
  "publisher": {"name": "Nouvel Éditeur"},
  "genres": [4, {"name": "Nouveau Genre"}]
}
```

## ✏️ Modification de livres

### Endpoint: `PUT /books/{id}`

La modification fonctionne maintenant **exactement comme la création** :

- ✅ Même flexibilité pour les formats d'entités
- ✅ Création automatique des nouvelles entités
- ✅ Réutilisation des entités existantes
- ✅ Gestion des relations many-to-many

### Exemple de modification :
```json
{
  "title": "Nouveau titre",
  "authors": [
    {"id": 1, "name": "Auteur Existant Modifié"},
    {"name": "Nouvel Auteur Ajouté"}
  ],
  "publisher": {"name": "Nouvel Éditeur"},
  "genres": [1, {"name": "Nouveau Genre"}]
}
```

## 🗑️ Suppression de livres

### Endpoint: `DELETE /books/{id}`

- Suppression simple par ID
- Les relations many-to-many sont nettoyées automatiquement
- Les entités (auteurs, éditeurs, genres) restent en base pour les autres livres

## 📋 Lecture de livres

### Endpoints disponibles :

- `GET /books/{id}` - Détail d'un livre avec toutes ses relations
- `GET /books` - Liste paginée avec recherche et filtres
- `GET /books/search` - Recherche avancée

## 🔄 Architecture technique

### Backend (FastAPI + SQLModel)

**Schémas unifiés :**
- `BookCreate` et `BookUpdate` utilisent la même structure flexible
- Support `Union[int, Dict[str, Any]]` pour toutes les entités

**Services intelligents :**
- `_process_authors_for_book()` - Gère IDs et objets auteurs
- `_process_publisher_for_book()` - Gère IDs et objets éditeur  
- `_process_genres_for_book()` - Gère IDs et objets genres
- Création automatique des entités manquantes

### Frontend (React Native + TypeScript)

**Types cohérents :**
- `BookCreate` et `BookUpdate` partagent la même structure
- Support des unions de types pour la flexibilité

**Composants réutilisables :**
- `SuggestedBookForm` - Formulaire avec sélecteurs d'entités
- `EntitySelectors` - Composants pour sélection/création d'entités
- `BookActions` - Actions CRUD dans les détails du livre

## 🎯 Avantages de cette architecture

1. **Cohérence** - Création et modification utilisent la même logique
2. **Flexibilité** - Support des IDs existants ET création d'entités
3. **Simplicité** - Pas de conversion complexe côté frontend
4. **Réutilisabilité** - Même code pour tous les types d'entités
5. **Performance** - Traitement optimisé en une seule transaction

## 🔍 Validation et sécurité

- Validation des données côté client et serveur
- Vérification d'unicité (titre + ISBN)
- Gestion des erreurs HTTP appropriées
- Nettoyage automatique des relations

## 📱 Interface utilisateur

- **Mobile-first** - Interface optimisée pour mobile et web
- **Navigation intuitive** - Boutons d'action contextuels
- **Feedback utilisateur** - Messages de confirmation/erreur
- **Responsive design** - Adaptation automatique aux écrans