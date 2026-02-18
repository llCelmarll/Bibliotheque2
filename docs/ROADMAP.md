# Roadmap & Idées de Fonctionnalités

Cette liste recense les futures évolutions envisagées pour l'application.

## Fonctionnalités

- [x] **Notes et Notation**
    - Ajout d'un système de notation (étoiles / score).
    - Ajout de notes personnelles (texte libre) sur une fiche livre.
- [x] **Recherche avancée**
    - Recherche multicritère (titre, auteur, catégorie, etc.).
- [~] **Prêt / Emprunt entre utilisateurs** *(en cours)*
    - [x] Modèle `UserLoanRequest` (demande de prêt inter-membres)
    - [x] Invitations bidirectionnelles entre utilisateurs (`ContactInvitation`)
    - [x] Partage de bibliothèque en lecture seule (`library_shared` sur Contact)
    - [x] Bibliothèque partagée paginée avec recherche (`GET /users/{id}/library`)
    - [ ] Interface frontend (bibliothèque partagée, demandes, invitations)
- [ ] **Découverte sociale avancée**
    - [ ] Profil public opt-in (visible sans invitation)
    - [ ] Recherche géographique de livres autour de soi

## Plateformes

- [annulé] **Support iOS** (pas pour tout de suite)
    - Adaptation et test de l'application pour iOS.
    - Configuration du build EAS pour iOS.
    - **Prérequis payant** : Programme Développeur Apple (~99 USD/an) obligatoire pour distribuer sur appareil réel (TestFlight, Ad Hoc ou App Store). Pas d’équivalent gratuit au « lien APK » comme sur Android.