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
  - Ajout manuel d’un livre
  - Ajout par scan de code-barres
    - Recherche automatique via API (Google Books en priorité, puis OpenLibrary si non trouvé)
    - Complétion manuelle des informations manquantes
  - Modification et suppression de livres
  - Gestion des métadonnées (auteur, éditeur, genre, nombre de pages, etc.)
  - Annotation de l’état du livre (neuf, usagé, abîmé)

- **Recherche et affichage**
  - Recherche par titre, auteur, éditeur ou genre
  - Affichage détaillé d’un livre (fiche complète)
  - Tri et filtres (par genre, auteur, date d’ajout, etc.)

---

## 🛠️ Fonctionnalités futures (roadmap)

- Multi-utilisateurs avec partage de bibliothèque (prioritaire)
- Gestion de prêts / emprunts
- Ajout de notes personnelles ou d’avis
- Export / import des données (CSV, JSON)
- Mode hors ligne pour l’application mobile

---

## 📌 TODO

- [ ] Définir précisément les champs d’un livre dans la base (ce qui est obligatoire ou optionnel)
- [ ] Décider des règles de priorité entre Google Books et OpenLibrary
- [ ] Réfléchir à l’interface (UI/UX) côté web et mobile
- [ ] Définir le mode d’authentification (email, OAuth, autre ?)
