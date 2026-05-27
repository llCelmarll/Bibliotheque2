# Roadmap vers Publication — Ma Bibliothèque

> Document de pilotage pour le passage de l'application en accès public.
> Mis à jour le 2026-05-27.

---

## Vue d'ensemble

L'application est fonctionnelle et stable en production privée (NAS Synology, ~13 utilisateurs en whitelist). L'objectif est d'ouvrir l'accès au public sur une infrastructure externe, après avoir atteint un niveau suffisant de qualité, sécurité et conformité légale.

**Version actuelle :** 1.0.7  
**Cible publication :** v1.1.0 (date TBD)

---

## Phases

### Phase 1 — Qualité & Sécurité (prioritaire)

Objectif : rendre l'application robuste avant d'exposer à des utilisateurs inconnus.

#### 1.1 Tests de performance
- [x] Identifier les endpoints les plus lents (logging des temps de réponse déjà en place via middleware `perf_counter`)
- [x] Détecter les requêtes N+1 sur les listings de livres — corrigé : suppression des `selectinload` imbriqués sur `Author.books` et `Genre.books` dans `book_repository.py` (3 requêtes)
- [x] Vérifier les index PostgreSQL — migration `a2b3c4d5e6f7` : ajout de `(owner_id, is_read)`, `(owner_id, created_at)` sur `books` et `(book_id, status)` sur `borrowed_books`
- [x] Optimiser le GROUP BY dans les recherches — `_deduplicate_and_sort` réduit de 14 colonnes à `Book.id` seul (compatible PostgreSQL PRIMARY KEY)
- [x] Mesurer le temps de chargement initial de la liste de livres — baseline Locust (10 users, 2min) : `/books/search/simple` P50=47ms, P95=250ms ✅ sous cible 300ms. Register P95=2400ms (bcrypt, normal).
- [ ] Tester le comportement sous charge légère (10–50 utilisateurs simultanés) — à refaire en prod sur infrastructure réelle

#### 1.2 Tests de sécurité
- [x] **Migration SHA256 → bcrypt** — tous les utilisateurs prod sont en bcrypt depuis mai 2026 (vérifié en base), support legacy SHA256 supprimé du code
- [x] **Rate limiter persistant** — migré vers PostgreSQL (`RateLimitAttempt`, migration `f1a2b3c4d5e6`), plus de remise à zéro au restart
- [x] **Supprimer `/auth/test`** — endpoint retiré
- [ ] **Confirmation d'email** à l'inscription (si la whitelist est levée)
- [ ] Audit des permissions : vérifier qu'aucun endpoint ne laisse accéder aux données d'un autre utilisateur
- [ ] Test de fuzzing sur les champs de saisie (titre, auteur, ISBN)
- [ ] Vérifier les headers de sécurité HTTP (CSP, X-Frame-Options, HSTS)

#### 1.3 Tests d'accessibilité (a11y)
- [ ] Ajouter `accessibilityLabel` sur tous les boutons icône (pas de texte visible)
- [ ] Ajouter `accessibilityHint` sur les actions non-évidentes (scan, swipe)
- [ ] Vérifier le contraste des textes dans les 4 thèmes visuels
- [ ] Tester la navigation avec TalkBack (Android)
- [ ] Gérer le focus logique dans les formulaires (ordre de tabulation)
- [ ] Vérifier que les modales sont accessibles (focus trap, fermeture avec retour arrière)

---

### Phase 2 — Conformité légale (obligatoire avant publication)

#### 2.1 RGPD
- [ ] **Politique de confidentialité** — document légal obligatoire, accessible depuis l'app et le site
  - Données collectées : email, username, bibliothèque, historique de prêts, token push
  - Base légale : consentement explicite à l'inscription
  - Durée de conservation
  - Droits des utilisateurs (accès, rectification, suppression, portabilité)
- [ ] **CGU (Conditions Générales d'Utilisation)**
  - Usage personnel uniquement
  - Contenu uploadé (couvertures)
  - Limitation de responsabilité
- [ ] **Suppression de compte complète** — vérifier que toutes les données personnelles sont effacées (livres, prêts, contacts, tokens push, invitations)
- [ ] **Export des données** — déjà partiellement implémenté via CSV, à compléter pour couvrir toutes les données personnelles (droit à la portabilité)
- [ ] Checkbox de consentement explicite à l'inscription

#### 2.2 Google Play Store
- [ ] Politique de confidentialité hébergée sur une URL publique (obligatoire pour le Play Store)
- [ ] Fiche store : titre, description courte, description longue, captures d'écran (min. 2)
- [ ] Déclaration des permissions utilisées (caméra pour scan, notifications, stockage)
- [ ] Questionnaire de contenu Google Play (classification de l'app)
- [ ] APK signé avec keystore de production (ne pas perdre le keystore !)

---

### Phase 3 — Infrastructure publique

#### 3.1 Hébergement (à migrer depuis le NAS)
Décision : le NAS Synology reste pour le dev/staging, la prod publique sera sur une infrastructure externe.

Budget cible : **0€/mois** (free tiers, évolutif si l'app prend de l'ampleur)

| Composant | Solution retenue | Alternative |
|---|---|---|
| Backend FastAPI | Render (free tier) | Railway |
| Base de données | Supabase (500 MB gratuit) | Neon |
| Couvertures (images) | Cloudflare R2 (10 GB gratuit) | Backblaze B2 |
| Frontend web | Cloudflare Pages | Vercel |
| Domaine | mabibliotheque.ovh (existant) | — |

Travaux nécessaires :
- [ ] Migrer les données de production depuis le NAS vers Supabase
- [ ] Adapter le service de couvertures pour uploader vers R2 au lieu du filesystem
- [ ] Configurer les variables d'environnement sur Render
- [ ] Mettre à jour les DNS pour pointer vers Render au lieu du NAS
- [ ] Mettre en place un backup automatique Supabase → stockage externe

#### 3.2 Politique d'inscription
- Décision : **inscription ouverte** dès le lancement public
- [ ] Implémenter la confirmation d'email (service Resend déjà en place)
- [ ] Mettre en place une page de présentation publique (landing page)

---

### Phase 4 — Financement

L'application est gratuite et le restera pour les utilisateurs. Les coûts d'infrastructure sont quasi nuls sur free tiers. Le modèle retenu pour couvrir les frais est l'**affiliation Amazon Associates**.

#### 4.1 Affiliation Amazon Associates (modèle principal)

Chaque fiche livre peut afficher un bouton "Voir sur Amazon" avec un lien affilié. Si l'utilisateur achète le livre (ou n'importe quoi d'autre dans les 24h), une commission de 2–4% est versée.

Avantages :
- Totalement non intrusif — bouton optionnel sur la fiche livre
- Cohérent avec l'usage : l'utilisateur cherche un livre → peut vouloir l'acheter
- Pas de publicité, pas de tracking supplémentaire visible

Mise en œuvre :
- [x] Créer un compte Amazon Associates — Store ID : `mabibliothe08-21`
- [ ] Construire les liens affiliés à partir de l'ISBN ou du titre du livre
  - Format : `https://www.amazon.fr/s?k={ISBN}&tag={mon-id-affilié}`
  - Fallback si pas d'ISBN : recherche par titre + auteur
- [ ] Ajouter le bouton "Voir sur Amazon" sur la fiche livre (désactivable dans les paramètres ?)
- [ ] Mentionner les liens affiliés dans la politique de confidentialité (obligation légale)
- [ ] Déclarer les liens commerciaux dans la fiche Play Store

Points d'attention :
- Les liens affiliés utilisent des cookies Amazon — à déclarer dans la politique de confidentialité
- Google Play autorise l'affiliation mais exige la transparence envers l'utilisateur
- Commission versée uniquement si l'achat est finalisé (pas au clic)

#### 4.2 Coûts prévisionnels si dépassement des free tiers

| Seuil | Coût estimé |
|---|---|
| < 500 utilisateurs, < 500 MB DB | 0€/mois |
| 500–2000 utilisateurs | ~10–20€/mois (Render Starter + Supabase Pro) |
| > 2000 utilisateurs | À évaluer selon l'usage réel |

#### 4.3 À ne pas faire
- Publicité display dans l'app (nuirait à l'expérience utilisateur)
- Vente de données (illégal RGPD, contraire aux valeurs du projet)
- Monétisation des fonctionnalités sociales (prêts, contacts)

---

## Critères de sortie (Definition of Done)

L'application est prête pour la publication publique quand :

- [ ] Tous les points de la Phase 1 (sécurité) sont traités
- [ ] La politique de confidentialité et les CGU sont rédigées et hébergées
- [ ] La suppression de compte est complète et testée
- [ ] L'application tourne sur l'infrastructure publique depuis au moins 2 semaines sans incident
- [ ] La fiche Play Store est complète et l'APK signé est prêt
- [ ] La politique d'inscription (whitelist vs ouverte) est décidée et implémentée

---

## Ce qui est hors scope pour la v1.1.0

- Support iOS (prérequis payant, non prioritaire)
- Détection automatique du thème système
- Découverte sociale avancée (profil public, recherche géographique)
- Système de rôles admin/bibliothécaire (SECURITY_PLAN.md)
