# 📚 Bibliothèque personnelle

Application permettant de gérer une bibliothèque de livres, accessible à la fois via une page web (PC) et une application mobile.  
Toutes les fonctionnalités seront disponibles sur les deux supports.

---

## 🚀 Fonctionnalités principales

- **Authentification et gestion des utilisateurs**
  - Création de comptes
  - Connexion / déconnexion
  - Gestion multi-utilisateurs

- **Gestion des livres**
  - Ajout manuel d'un livre
  - Ajout par scan de code-barres
    - Recherche automatique via API (Google Books en priorité, puis OpenLibrary si non trouvé)
    - Complétion manuelle des informations manquantes
  - **Import CSV en masse**
    - Détection automatique de l'encodage (UTF-8, Windows-1252, ISO-8859-1)
    - Mapping intelligent des colonnes (titre, auteur, ISBN, éditeur, genre, etc.)
    - Aperçu des données avant import
    - Option de peuplement automatique des couvertures
    - Barre de progression en temps réel
    - Gestion des erreurs avec rapport détaillé
    - Export des erreurs en CSV/JSON pour correction
  - Modification et suppression de livres
  - Gestion des métadonnées (auteur, éditeur, genre, nombre de pages, etc.)
  - Annotation de l'état du livre (neuf, usagé, abîmé)

- **Recherche et affichage**
  - Recherche par titre, auteur, éditeur ou genre
  - Affichage détaillé d’un livre (fiche complète)
  - Tri et filtres (par genre, auteur, date d’ajout, etc.)

---

## � Import CSV : Guide Rapide

### Format du Fichier CSV

Le fichier CSV doit utiliser le **point-virgule (`;`)** comme séparateur et contenir les colonnes suivantes (ordre non important) :

| Colonne | Noms acceptés | Obligatoire | Exemple |
|---------|---------------|-------------|---------|
| Titre | `titre`, `title` | ✅ Oui | Le Seigneur des Anneaux |
| ISBN | `isbn`, `ISBN` | ❌ Non | 9782266154345 |
| Auteur(s) | `auteur`, `auteurs`, `author`, `authors` | ❌ Non | J.R.R. Tolkien |
| Éditeur | `editeur`, `éditeur`, `publisher` | ❌ Non | Pocket |
| Genre(s) | `genre`, `genres` | ❌ Non | Fantasy, Aventure |
| Date | `date_publication`, `année`, `year` | ❌ Non | 2001 |
| Pages | `pages`, `page_count` | ❌ Non | 1216 |

**Note :** Pour les auteurs et genres multiples, séparez-les par des **virgules** ou **points-virgules**.

### Exemple de Fichier CSV

```csv
titre;isbn;auteur;editeur;genre;date_publication;pages
"Le Seigneur des Anneaux";"9782266154345";"J.R.R. Tolkien";"Pocket";"Fantasy, Aventure";"2001";1216
"1984";"9782070368228";"George Orwell";"Gallimard";"Science-fiction, Dystopie";"1950";439
"Harry Potter à l'école des sorciers";"9782070584628";"J.K. Rowling";"Gallimard Jeunesse";"Fantasy";"1998";320
```

### Types d'Erreurs Fréquentes

| Erreur | Cause | Solution |
|--------|-------|----------|
| **Conflit de doublon** | Auteur/éditeur existe avec orthographe différente (MAJUSCULES, accents) | Utiliser l'orthographe exacte de la base |
| **ISBN invalide** | ISBN ne contient pas 10 ou 13 chiffres | Corriger l'ISBN (sans tirets) |
| **Livre existant** | Un livre identique existe déjà | Vérifier et supprimer du CSV |
| **Format corrompu** | Guillemets non fermés, séparateurs incorrects | Réexporter proprement le CSV |

### Export des Erreurs

En cas d'erreurs lors de l'import, vous pouvez :
- **Exporter en CSV** : Pour ouvrir dans Excel et corriger facilement ligne par ligne
- **Exporter en JSON** : Pour archiver avec métadonnées complètes (date, statistiques)

Les fichiers exportés contiennent :
- Numéro de ligne dans le fichier original
- Titre et ISBN du livre concerné
- Message d'erreur détaillé avec solution recommandée

---

## �🛠️ Fonctionnalités futures (roadmap)

- Multi-utilisateurs avec partage de bibliothèque (prioritaire)
- Gestion de prêts / emprunts
- Ajout de notes personnelles ou d'avis
- Export complet de la bibliothèque (CSV, JSON)
- Mode hors ligne pour l'application mobile

---

##  TODO

- [ ] Définir précisément les champs d’un livre dans la base (ce qui est obligatoire ou optionnel)
- [ ] Décider des règles de priorité entre Google Books et OpenLibrary
- [ ] Réfléchir à l’interface (UI/UX) côté web et mobile
- [ ] Définir le mode d’authentification (email, OAuth, autre ?)
