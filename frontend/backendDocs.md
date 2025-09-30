``` markdown
# 📚 API de Gestion de Livres

Une API REST complète pour la gestion d'une bibliothèque, construite avec FastAPI, SQLAlchemy et Python.

## 🚀 Démarrage Rapide

### Prérequis
- Python 3.11+
- pip ou virtualenv

### Installation

1. **Cloner le projet**
   ```bash
   git clone <votre-repo>
   cd book-management-api
   ```

2. **Installer les dépendances**
   ```bash
   pip install -r requirements.txt
   ```

3. **Lancer l'API**
   ```bash
   uvicorn app.main:app --reload
   ```

4. **Accéder à la documentation**
   - Documentation interactive : http://localhost:8000/docs
   - Documentation ReDoc : http://localhost:8000/redoc

---

## 📖 Endpoints API

### Base URL
```
[http://localhost:8000](http://localhost:8000)
``` 

### 🔐 Authentification
*Aucune authentification requise pour cette version*

---

## 📚 Gestion des Livres

### **📋 Créer un livre**
```
http POST /books Content-Type: application/json
``` 

**Body:**
```
json { "title": "Le Petit Prince", "isbn": "978-2-07-040857-4", "published_date": 1943, "page_count": 96, "barcode": "9782070408574", "cover_url": "[https://example.com/cover.jpg](https://example.com/cover.jpg)", "authors": [1, 2], "publisher": 1, "genre": [1, 3] }
``` 

**Réponse (201):**
```
json { "id": 1, "title": "Le Petit Prince", "isbn": "978-2-07-040857-4", "published_date": 1943, "page_count": 96, "barcode": "9782070408574", "cover_url": "[https://example.com/cover.jpg](https://example.com/cover.jpg)", "created_at": "2024-01-15T10:30:00Z", "updated_at": null, "authors": [...], "publisher": {...}, "genre": [...] }
``` 

### **📖 Récupérer un livre**
```
http GET /books/{id}
``` 

**Exemple:**
```
bash curl [http://localhost:8000/books/1](http://localhost:8000/books/1)
``` 

### **✏️ Modifier un livre**
```
http PUT /books/{id} Content-Type: application/json
``` 

**Body (tous les champs sont optionnels):**
```
json { "title": "Le Petit Prince - Édition Annotée", "page_count": 120, "authors": [1] }
``` 

### **🗑️ Supprimer un livre**
```
http DELETE /books/{id}
``` 

**Réponse:** `204 No Content`

---

## 📊 Listing et Pagination

### **📋 Lister tous les livres**
```
http GET /books?skip=0&limit=100&sort_by=title&sort_order=asc
``` 

**Paramètres:**
| Paramètre | Type | Défaut | Description |
|-----------|------|---------|-------------|
| `skip` | int | 0 | Nombre d'éléments à ignorer |
| `limit` | int | 100 | Nombre max d'éléments (max: 1000) |
| `sort_by` | string | "title" | Champ de tri* |
| `sort_order` | string | "asc" | Ordre: "asc" ou "desc" |

*Champs de tri disponibles: `title`, `published_date`, `page_count`, `isbn`, `created_at`, `updated_at`

**Exemples:**
```
bash
# Les 10 premiers livres
curl "[http://localhost:8000/books?limit=10](http://localhost:8000/books?limit=10)"
# Page 2 (livres 21-40)
curl "[http://localhost:8000/books?skip=20&limit=20](http://localhost:8000/books?skip=20&limit=20)"
# Tri par date de publication (plus récent en premier)
curl "[http://localhost:8000/books?sort_by=published_date&sort_order=desc](http://localhost:8000/books?sort_by=published_date&sort_order=desc)"
``` 

---

## 🔍 Recherche

### **🔍 Recherche Simple**
```
http GET /books/search/simple?q=recherche&skip=0&limit=100&sort_by=title&sort_order=asc
``` 

Recherche dans tous les champs : titre, ISBN, auteur, éditeur, genre.

**Exemples:**
```
bash
# Rechercher "python"
curl "[http://localhost:8000/books/search/simple?q=python](http://localhost:8000/books/search/simple?q=python)"
# Rechercher par ISBN
curl "[http://localhost:8000/books/search/simple?q=978-2-07-040857-4](http://localhost:8000/books/search/simple?q=978-2-07-040857-4)"
# Rechercher un auteur
curl "[http://localhost:8000/books/search/simple?q=Antoine+de+Saint-Exup%C3%A9ry](http://localhost:8000/books/search/simple?q=Antoine+de+Saint-Exup%C3%A9ry)"
``` 

### **🎯 Recherche Avancée**
```
http GET /books/search/advanced
``` 

**Paramètres disponibles:**
| Paramètre | Type | Description |
|-----------|------|-------------|
| `title` | string | Recherche dans le titre |
| `author` | string | Recherche dans le nom de l'auteur |
| `publisher` | string | Recherche dans le nom de l'éditeur |
| `genre` | string | Recherche dans le nom du genre |
| `isbn` | string | Recherche dans l'ISBN |
| `year_min` | int | Année de publication minimale |
| `year_max` | int | Année de publication maximale |
| `page_min` | int | Nombre de pages minimal |
| `page_max` | int | Nombre de pages maximal |
| `skip` | int | Pagination |
| `limit` | int | Nombre max de résultats |
| `sort_by` | string | Champ de tri |
| `sort_order` | string | Ordre de tri |

**Exemples:**
```
bash
# Livres de science-fiction entre 1950 et 2000
curl "[http://localhost:8000/books/search/advanced?genre=science-fiction&year_min=1950&year_max=2000](http://localhost:8000/books/search/advanced?genre=science-fiction&year_min=1950&year_max=2000)"
# Livres de plus de 300 pages publiés par Gallimard
curl "[http://localhost:8000/books/search/advanced?publisher=Gallimard&page_min=300](http://localhost:8000/books/search/advanced?publisher=Gallimard&page_min=300)"
# Romans français du 19ème siècle
curl "[http://localhost:8000/books/search/advanced?genre=roman&year_min=1800&year_max=1899](http://localhost:8000/books/search/advanced?genre=roman&year_min=1800&year_max=1899)"
``` 

---

## 📊 Statistiques

### **📈 Statistiques Globales**
```
http GET /books/statistics
``` 

**Réponse:**
```
json { "total_books": 1250, "average_pages": 287.54, "oldest_publication_year": 1605, "newest_publication_year": 2024 }
``` 

---

## 🔗 Relations

### **👤 Livres par Auteur**
```
http GET /books/by-author/{author_id}
``` 

### **🏢 Livres par Éditeur**
```
http GET /books/by-publisher/{publisher_id}
``` 

### **🎭 Livres par Genre**
```
http GET /books/by-genre/{genre_id}
``` 

**Exemples:**
```
bash curl [http://localhost:8000/books/by-author/1](http://localhost:8000/books/by-author/1) curl [http://localhost:8000/books/by-publisher/5](http://localhost:8000/books/by-publisher/5) curl [http://localhost:8000/books/by-genre/3](http://localhost:8000/books/by-genre/3)
``` 

---

## 🚀 Opérations Avancées

### **📚 Création en Lot**
```
http POST /books/bulk Content-Type: application/json
``` 

**Body:**
```
json [ {
latex_unknown_tag
``` 

**⚠️ Important:** Si un livre échoue, toute l'opération est annulée.

### **🏥 Health Check**
```
http GET /books/health
``` 

**Réponse:**
```
json { "status": "healthy", "service": "books", "version": "1.0.0" }
``` 

---

## 🎨 Intégration Frontend

### **JavaScript/TypeScript**
```
javascript // Configuration de base const API_BASE = '[http://localhost:8000](http://localhost:8000)';
// Récupérer tous les livres async function getBooks(page = 0, limit = 20) { const response = await fetch(`${API_BASE}/books?skip=${page * limit}&limit=${limit}`); return await response.json(); }
// Rechercher des livres async function searchBooks(query) { const response = await fetch(`${API_BASE}/books/search/simple?q=${encodeURIComponent(query)}`); return await response.json(); }
// Créer un livre async function createBook(bookData) { const response = await fetch(`${API_BASE}/books`, { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(bookData) });
if (!response.ok) { throw new Error(await response.text()); }
return await response.json(); }
// Mettre à jour un livre async function updateBook(id, updates) { const response = await fetch(`${API_BASE}/books/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(updates) });
return await response.json(); }
// Supprimer un livre async function deleteBook(id) { const response = await fetch(`${API_BASE}/books/${id}`, { method: 'DELETE' });
return response.ok; }
``` 

### **React Hook Example**
```
typescript import { useState, useEffect } from 'react';
interface Book { id: number; title: string; isbn?: string; published_date?: number; page_count?: number; authors: Author[]; publisher?: Publisher; genre: Genre[]; }
export function useBooks(page = 0, limit = 20) { const [books, setBooks] = useState<Book[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
useEffect(() => { async function fetchBooks() { try { setLoading(true); const response = await fetch(`/api/books?skip=${page * limit}&limit=${limit}`); if (!response.ok) throw new Error('Erreur de chargement'); const data = await response.json(); setBooks(data); } catch (err) { setError(err.message); } finally { setLoading(false); } }
fetchBooks();
}, [page, limit]);
return { books, loading, error }; }
``` 

---

## ⚠️ Gestion des Erreurs

### **Codes d'erreur courants**

| Code | Description | Exemple |
|------|-------------|---------|
| 400 | Bad Request | Données invalides, paramètres manquants |
| 404 | Not Found | Livre, auteur, éditeur ou genre non trouvé |
| 422 | Validation Error | Format de données incorrect |
| 500 | Internal Error | Erreur serveur |

### **Format des erreurs**
```
json { "detail": "Description de l'erreur" }
``` 

### **Gestion côté client**
```
javascript try { const book = await createBook(bookData); } catch (error) { if (error.status === 400) { console.error('Données invalides:', error.detail); } else if (error.status === 404) { console.error('Ressource non trouvée'); } else { console.error('Erreur serveur:', error.detail); } }
``` 

---

## 🎯 Cas d'Usage Courants

### **📋 Interface de Listing**
```
javascript // Composant de liste avec pagination et recherche function BookList() { const [books, setBooks] = useState([]); const [search, setSearch] = useState(''); const [page, setPage] = useState(0);
// Charger les livres avec recherche useEffect(() => { const endpoint = search ? `/books/search/simple?q=${search}&skip=${page * 20}&limit=20` : `/books?skip=${page * 20}&limit=20`;
fetch(endpoint)
  .then(res => res.json())
  .then(setBooks);
}, [search, page]); }
``` 

### **📊 Dashboard de Statistiques**
```
javascript // Récupérer les statistiques pour un dashboard async function loadDashboardData() { const [stats, recentBooks] = await Promise.all([ fetch('/books/statistics').then(r => r.json()), fetch('/books?sort_by=created_at&sort_order=desc&limit=5').then(r => r.json()) ]);
return { stats, recentBooks }; }
``` 

### **🔍 Recherche Avancée**
```
javascript // Formulaire de recherche avancée function AdvancedSearch({ onResults }) { const [filters, setFilters] = useState({ title: '', author: '', year_min: '', year_max: '', genre: '' });
const handleSearch = async () => { const params = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value) params.append(key, value); });
const results = await fetch(`/books/search/advanced?${params}`)
  .then(r => r.json());

onResults(results);
}; }
``` 

---

## 📝 Notes Importantes

### **🎯 Bonnes Pratiques**

1. **Pagination:** Toujours utiliser la pagination pour les listes
2. **Validation:** Vérifier les données côté client ET serveur
3. **Gestion d'erreurs:** Prévoir tous les cas d'erreur
4. **Loading states:** Afficher des indicateurs de chargement
5. **Debouncing:** Pour les recherches en temps réel

### **⚡ Performance**

- Utilisez la pagination pour éviter de charger trop de données
- Implémentez du debouncing pour les recherches
- Cachez les résultats de recherche côté client
- Utilisez les paramètres de tri pour optimiser l'affichage

### **🔒 Sécurité**

- Toujours échapper les paramètres d'URL
- Valider les entrées utilisateur
- Gérer les erreurs sans exposer d'informations sensibles

---

## 🚀 Développement

Pour étendre cette API :

1. **Ajouter des endpoints** dans `app/routers/`
2. **Modifier les modèles** dans `app/models/`
3. **Étendre les schémas** dans `app/schemas/`
4. **Ajouter de la logique métier** dans `app/services/`

---

## 📞 Support

Pour toute question ou problème :

1. Consulter la documentation interactive : `/docs`
2. Vérifier les logs de l'API
3. Tester les endpoints avec curl ou Postman
4. Vérifier la structure des données dans `/redoc`

---

**🎉 Votre API est prête à être utilisée !**
```
