# Roadmap & Idées de Fonctionnalités

Cette liste recense les futures évolutions envisagées pour l'application.

## Corrections

- [x] **Boutons Lu/Non-Lu pas homogenes**
- [x] **Bouton (+) dans la liste de livre devrait renvoyer vers le scanner**
- [x] **Bouton d'ajout manuel sur le scanner web**


## Fonctionnalités

- [x] **Notes et Notation**
    - Ajout d'un système de notation (étoiles / score).
    - Ajout de notes personnelles (texte libre) sur une fiche livre.
- [x] **Recherche avancée**
    - Recherche multicritère (titre, auteur, catégorie, etc.).
- [ ] **Ajout d'un champ sous-titre pour les livres**
    - Ajouter un champ `sous_titre` aux livres.
    - L'afficher dans les formulaires, les fiches livre et les imports/exports concernés.
- [ ] **Stabilisation Google Books / OpenLibrary (saisie + quota)**
    - Corriger l'ecran blanc qui annule la saisie lors d'une recherche ou d'un ajout via Google Books / OpenLibrary.
    - Utiliser une clé API Google Books dédiée pour réduire les erreurs de quota (`rateLimitExceeded`).
    - Ajouter une gestion explicite des erreurs `429 RESOURCE_EXHAUSTED` avec message utilisateur non bloquant.
- [x] **Prêt / Emprunt entre utilisateurs** *(en cours)*
    - [x] Modèle `UserLoanRequest` (demande de prêt inter-membres)
    - [x] Invitations bidirectionnelles entre utilisateurs (`ContactInvitation`)
    - [x] Partage de bibliothèque en lecture seule (`library_shared` sur Contact)
    - [x] Bibliothèque partagée paginée avec recherche (`GET /users/{id}/library`)
    - [x] Interface frontend (bibliothèque partagée, demandes, invitations)
- [ ] **Découverte sociale avancée**
    - [ ] Profil public opt-in (visible sans invitation)
    - [ ] Recherche géographique de livres autour de soi
- [x] **Système de Recommandations**
    - Suggérer éditeurs, genres et auteurs basés sur les autres utilisateurs.
- [x] **Communication / UX**
    - Trouver un moyen d'informer les utilisateurs des fonctionnalités apportées par les mises à jour.
- [x] **Thèmes visuels**
    - Support de 4 thèmes (Chaleureuse, Sombre & Élégante, Minimaliste, Nature) sélectionnables depuis les paramètres.
- [ ] **Détection automatique du thème système**
    - Utiliser `useColorScheme()` pour appliquer automatiquement un thème clair ou sombre selon les préférences système de l'appareil, avec possibilité d'override manuel.
- [ ] **Import / Export de données**
    - Mise à jour de l'import CSV pour supporter les nouvelles données (champs manquants, nouveaux modèles).
    - Ajout d'une fonctionnalité d'export de la bibliothèque au format CSV.
- [x] **Version de test avant production (préproduction/staging)**
    - Créer une version de test dans les conditions réelles de déploiement.
    - Valider les éventuels problèmes (techniques, configuration, performance) avant déploiement sur la version de production.
- [x] **Notifications Android**
    - Mise en place de notifications push (Expo Notifications) pour les événements importants (demandes d'amis, prêts, etc.).

## Plateformes

- [annulé] **Support iOS** (pas pour tout de suite)
    - Adaptation et test de l'application pour iOS.
    - Configuration du build EAS pour iOS.
    - **Prérequis payant** : Programme Développeur Apple (~99 USD/an) obligatoire pour distribuer sur appareil réel (TestFlight, Ad Hoc ou App Store). Pas d’équivalent gratuit au « lien APK » comme sur Android.