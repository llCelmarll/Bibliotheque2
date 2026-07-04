# Politique de confidentialité — Ma Bibliothèque

*Dernière mise à jour : juillet 2026*

---

## 1. Qui sommes-nous ?

**Ma Bibliothèque** est une application mobile de gestion de bibliothèque personnelle développée et exploitée par Quentin Diaz de Cerio.

**Contact :** quentin.ddc@hotmail.fr

Pour toute question relative à vos données personnelles ou pour exercer vos droits, contactez-nous à cette adresse.

---

## 2. Données collectées

### 2.1 Données de compte

Lors de votre inscription, nous collectons :

| Donnée | Utilisation |
|---|---|
| Adresse e-mail | Identifiant de connexion, vérification du compte, communications liées au service |
| Nom d'utilisateur | Affichage dans l'application |
| Mot de passe | Authentification — stocké sous forme de hash bcrypt (jamais en clair) |

### 2.2 Données de bibliothèque

Les données que vous saisissez volontairement dans l'application :

- **Livres** : titre, sous-titre, ISBN, auteurs, éditeur, date de publication, nombre de pages, statut de lecture, date de lecture, note (0–5 étoiles), notes personnelles
- **Couvertures de livres** : images uploadées ou récupérées automatiquement depuis Google Books / OpenLibrary, redimensionnées et stockées sur nos serveurs (600×900 px max, format JPEG)
- **Prêts et emprunts** : contacts, dates de prêt, dates de retour prévues et effectives, notes
- **Contacts** : nom, e-mail (facultatif), téléphone (facultatif), notes personnelles

### 2.3 Données sociales

Si vous utilisez les fonctionnalités sociales :

- Invitations de contact (expéditeur, destinataire, message facultatif, statut, dates)
- Demandes de prêt entre membres (demandeur, prêteur, livre, message, dates)
- Préférence de partage de bibliothèque avec vos contacts

### 2.4 Données techniques

Collectées automatiquement lors de l'utilisation :

- **Adresse IP** : enregistrée temporairement lors des tentatives de connexion, d'inscription, et de réinitialisation de mot de passe, à des fins de protection contre les abus (supprimée automatiquement après 15 minutes)
- **Tokens JWT** : jetons d'authentification stockés localement sur votre appareil (accès : 30 minutes ou 30 jours avec "se souvenir de moi" ; rafraîchissement : 1 jour ou 60 jours)
- **Tokens de vérification e-mail** : valables 24 heures, à usage unique
- **Tokens de réinitialisation de mot de passe** : valables 15 minutes, à usage unique

### 2.5 Notifications push

Si vous activez les notifications :

- Un **token Expo Push** propre à votre appareil est collecté et stocké sur nos serveurs
- Vos préférences de notification (par type d'événement) sont enregistrées
- Vous pouvez désactiver les notifications à tout moment depuis les paramètres de l'application ou de votre appareil

---

## 3. Base légale du traitement

| Traitement | Base légale |
|---|---|
| Création et gestion du compte | Exécution du contrat (CGU) |
| Authentification et sécurité | Intérêt légitime (protection contre la fraude) |
| Envoi d'e-mails transactionnels (vérification, réinitialisation) | Exécution du contrat |
| Notifications push | Consentement explicite |
| Journaux d'accès temporaires (rate limiting) | Intérêt légitime (sécurité) |
| Données de bibliothèque et prêts | Exécution du contrat |

---

## 4. Durée de conservation

| Donnée | Durée |
|---|---|
| Données de compte et bibliothèque | Jusqu'à suppression du compte |
| Adresses IP (rate limiting) | 15 minutes |
| Tokens de vérification e-mail | 24 heures |
| Tokens de réinitialisation de mot de passe | 15 minutes |
| Tokens push | Jusqu'à désinscription ou suppression du compte |
| Journaux d'audit (actions modération) | Durée indéterminée (obligation de traçabilité) |

---

## 5. Sécurité des données

- **Mots de passe** : stockés exclusivement sous forme de hash bcrypt (avec pré-hash SHA-256) — il nous est techniquement impossible de connaître votre mot de passe
- **Communications** : chiffrées via HTTPS (TLS) en production
- **Tokens** : générés cryptographiquement (`secrets.token_urlsafe`)
- **Limitation des accès** : rate limiting sur tous les endpoints sensibles (connexion, inscription, réinitialisation)
- **Headers de sécurité HTTP** : CSP, X-Frame-Options, HSTS activés en production

---

## 6. Partage des données avec des tiers

Nous ne vendons ni ne louons vos données personnelles. Certains prestataires techniques accèdent aux données dans le cadre de la fourniture du service :

| Prestataire | Données transmises | Finalité |
|---|---|---|
| **Resend** (resend.com) | Adresse e-mail, nom d'utilisateur | Envoi des e-mails transactionnels |
| **Expo** (expo.dev) | Token push de l'appareil | Envoi des notifications push |
| **Google Books API** | ISBN ou titre du livre | Récupération des métadonnées de livres |
| **OpenLibrary** (openlibrary.org) | ISBN ou titre du livre | Récupération des métadonnées de livres |

Ces prestataires traitent les données uniquement pour les finalités décrites et sont soumis à leurs propres politiques de confidentialité.

### 6.1 Liens affiliés Amazon

Certaines fiches livres affichent un bouton "Voir sur Amazon". Ces liens contiennent un identifiant affilié Amazon Associates (`mabibliothe08-21`). Lorsque vous cliquez sur ce lien :

- Aucune donnée personnelle vous concernant n'est transmise à Amazon par notre application
- Amazon peut déposer des cookies sur votre appareil conformément à sa propre politique de confidentialité
- Si vous effectuez un achat via ce lien, nous percevons une commission d'affiliation

*En tant que Partenaire Amazon, nous réalisons un bénéfice sur les achats remplissant les conditions requises.*

---

## 7. Vos droits (RGPD)

Conformément au Règlement Général sur la Protection des Données (UE 2016/679), vous disposez des droits suivants :

- **Droit d'accès** : consulter toutes vos données via votre profil dans l'application
- **Droit de rectification** : modifier votre e-mail ou nom d'utilisateur depuis les paramètres
- **Droit à l'effacement** : supprimer votre compte et toutes vos données depuis les paramètres de l'application (suppression immédiate et définitive)
- **Droit à la portabilité** : exporter votre bibliothèque au format CSV depuis l'application
- **Droit d'opposition aux notifications** : désactiver chaque type de notification push indépendamment
- **Droit de réclamation** : introduire une réclamation auprès de la CNIL (cnil.fr)

Pour exercer vos droits (accès, rectification, effacement, portabilité), contactez-nous à **quentin.ddc@hotmail.fr**. Nous répondrons dans un délai de 30 jours.

### Ce qui est supprimé lors de la suppression de compte

La suppression de votre compte entraîne la suppression immédiate et définitive de :
- Votre profil (e-mail, nom d'utilisateur, mot de passe hashé)
- Tous vos livres et couvertures associées
- Tous vos prêts et emprunts
- Tous vos contacts
- Toutes vos demandes de prêt et invitations
- Vos tokens push

---

## 8. Permissions de l'application

L'application mobile demande les permissions suivantes :

| Permission | Utilisation |
|---|---|
| **Caméra** | Scanner les codes-barres des livres |
| **Photos / Galerie** | Choisir une image de couverture pour un livre |
| **Notifications** | Recevoir des alertes pour les invitations, demandes de prêt, etc. |
| **Calendrier** | Créer des rappels de retour de livres (facultatif) |

Chaque permission n'est demandée que lors de la première utilisation de la fonctionnalité concernée. Vous pouvez révoquer ces permissions à tout moment depuis les paramètres de votre appareil.

---

## 9. Données des mineurs

L'application est destinée à un public adulte. Nous ne collectons pas sciemment de données personnelles de personnes de moins de 16 ans. Si vous pensez qu'un mineur a créé un compte, contactez-nous pour que nous le supprimions.

---

## 10. Modifications de cette politique

En cas de modification substantielle de cette politique, nous vous en informerons via l'application ou par e-mail. La date de dernière mise à jour figure en haut de ce document.

---

## 11. Contact et réclamations

**Responsable du traitement :**
Quentin Diaz de Cerio — quentin.ddc@hotmail.fr

**Autorité de contrôle :**
Commission Nationale de l'Informatique et des Libertés (CNIL)
3 place de Fontenoy, 75007 Paris
www.cnil.fr
