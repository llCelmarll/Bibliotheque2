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
- [x] **Ajout d'un champ sous-titre pour les livres**
    - Ajouter un champ `subtitle` aux livres (modèle + migration).
    - Pré-remplir automatiquement depuis Google Books lors d'un scan.
    - L'afficher dans les formulaires, les fiches livre, les listes et les cartes.
    - Inclure dans la recherche simple (titre + sous-titre).
    - [ ] *(itération future)* Recherche avancée par sous-titre
    - [x] Import/export CSV avec colonne sous-titre
- [x] **Stabilisation Google Books / OpenLibrary (saisie + quota)**
    - Corriger l'ecran blanc qui annule la saisie lors d'une recherche ou d'un ajout via Google Books / OpenLibrary.
    - Utiliser une clé API Google Books dédiée pour réduire les erreurs de quota (`rateLimitExceeded`).
    - Ajouter une gestion explicite des erreurs `429 RESOURCE_EXHAUSTED` avec message utilisateur non bloquant.
- [x] **Prêt / Emprunt entre utilisateurs**
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
- [x] **Import / Export de données**
    - [x] Export CSV de la bibliothèque complète.
    - [x] Import CSV avec gestion des doublons (avec et sans ISBN), résolution des conflits en batch, auto-couverture.
    - [x] Import avec complétion des champs manquants via écran de modification.

## Optimisations API externes (Google Books / OpenLibrary)

- [x] **Suppression des appels API sur la page détail**
    - `GET /books/{id}` n'appelle plus Google Books + OpenLibrary → affichage instantané, plus de 429.
    - L'écran d'édition propose un bouton "Chercher les infos en ligne" à la demande.
    - Comparaison côte à côte des données en base et en ligne (nouveau / différent / identique) pour choisir précisément quels champs importer.
- [x] **Version de test avant production (préproduction/staging)**
    - Créer une version de test dans les conditions réelles de déploiement.
    - Valider les éventuels problèmes (techniques, configuration, performance) avant déploiement sur la version de production.
- [x] **Notifications Android**
    - Mise en place de notifications push (Expo Notifications) pour les événements importants (demandes d'amis, prêts, etc.).

## Qualité & Tests

- [x] **Tests de non-régression — champ sous-titre**
    - 10 tests unitaires backend couvrant `book_repository.create()`, `update_book()`, `_apply_global_search()`, `SuggestedBook` et `scan_isbn()`.
- [ ] **Amélioration de la couverture de tests backend**
    - Couverture globale actuelle : 79% (923 lignes non couvertes sur 4354).
    - Priorités identifiées :
        - `book_service.py` : 55% — cœur du projet, à couvrir en priorité
        - `contact_invitation_service.py` : 19% — quasi non testé
        - `auth_service.py` : 63%
        - `push_notification_service.py` : 46%
- [ ] **Audit des performances**
    - Identifier les pages, endpoints et requêtes les plus coûteux.
    - Mesurer les temps de réponse, les chargements et les éventuels goulots d'étranglement.
    - Prioriser les optimisations à fort impact avant les prochaines évolutions.

## Accessibilité & Référencement

- [ ] **Accessibilité (a11y)**
    - Ajouter des labels d'accessibilité (`accessibilityLabel`, `accessibilityHint`) sur les éléments interactifs (boutons, icônes, champs).
    - Vérifier la compatibilité avec les lecteurs d'écran (TalkBack sur Android).
    - Assurer un contraste suffisant pour les textes dans tous les thèmes visuels.
    - Gérer la navigation au clavier et le focus logique dans les formulaires.
- [ ] **Référencement / Découvrabilité (SEO / ASO)**
    - Optimiser la fiche Google Play Store (titre, description, captures d'écran, mots-clés).
    - Ajouter des métadonnées structurées si une version web publique est envisagée.
    - Mettre en place une page de présentation publique (landing page) avec description de l'application.

## Plateformes

- [annulé] **Support iOS** (pas pour tout de suite)
    - Adaptation et test de l'application pour iOS.
    - Configuration du build EAS pour iOS.
    - **Prérequis payant** : Programme Développeur Apple (~99 USD/an) obligatoire pour distribuer sur appareil réel (TestFlight, Ad Hoc ou App Store). Pas d’équivalent gratuit au « lien APK » comme sur Android.