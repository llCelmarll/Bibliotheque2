# Roadmap vers Publication — Ma Bibliothèque

> Document de pilotage pour le passage de l'application en accès public.
> Mis à jour le 2026-05-31.

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
- [x] Mesurer le temps de chargement initial de la liste de livres — baseline Locust (10 users, 2min) : `/books/search/simple` P50=38ms, P95=280ms ✅ sous cible 300ms. Register P95=2400ms (bcrypt, normal). Résultats : `backend/tests/performance/results/book_crud_20260527_210108_stats.csv`
- [ ] Tester le comportement sous charge légère (10–50 utilisateurs simultanés) — à faire en prod sur infra réelle (tests actuels = machine locale uniquement) — [Plan →](PLAN_TEST_CHARGE_PROD.md)

#### 1.2 Tests de sécurité
- [x] **Migration SHA256 → bcrypt** — tous les utilisateurs prod sont en bcrypt depuis mai 2026 (vérifié en base), support legacy SHA256 supprimé du code
- [x] **Rate limiter persistant** — migré vers PostgreSQL (`RateLimitAttempt`, migration `f1a2b3c4d5e6`), plus de remise à zéro au restart
- [x] **Supprimer `/auth/test`** — endpoint retiré
- [x] **Confirmation d'email** à l'inscription — token 24h, blocage connexion si non vérifié, renvoi possible via `POST /auth/resend-verification`
- [x] Audit des permissions : vérifier qu'aucun endpoint ne laisse accéder aux données d'un autre utilisateur — ownership vérifié partout, aucune faille détectée
- [x] Logging des suppressions de compte (date, IP) pour support et conformité RGPD
- [x] Test de fuzzing sur les champs de saisie (titre, auteur, ISBN) — 64 tests dans `tests/integration/test_fuzzing.py` ; validators `min_length`/`max_length` ajoutés dans tous les schémas Pydantic
- [x] Vérifier les headers de sécurité HTTP (CSP, X-Frame-Options, HSTS) — middleware `security_headers` dans `main.py` ; HSTS activé uniquement hors dev ; Swagger désactivé en production

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
- [x] **Suppression de compte complète** — implémentée et vérifiée : tokens (reset, email, push), demandes de prêt, invitations, contacts, prêts, livres empruntés, livres, log IP (`account.py`)
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
- [x] Implémenter la confirmation d'email (service Resend déjà en place — token 24h, blocage connexion si non vérifié, renvoi possible)
- [x] Mettre en place une page de présentation publique (landing page)

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
- [x] Construire les liens affiliés à partir de l'ISBN ou du titre du livre — `frontend/utils/amazonLink.ts`, Store ID dans `config/api.ts`
- [x] Ajouter le bouton "Voir sur Amazon" — écran scan (`app/scan/[isbn].tsx`) et bibliothèque d'un contact (`components/BookDetail/SharedBookView.tsx`)
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

- [ ] Tous les points de la Phase 1 (sécurité) sont traités — manque : fuzzing, headers HTTP, a11y complète
- [ ] La politique de confidentialité et les CGU sont rédigées et hébergées
- [x] La suppression de compte est complète et testée
- [ ] L'application tourne sur l'infrastructure publique depuis au moins 2 semaines sans incident
- [ ] La fiche Play Store est complète et l'APK signé est prêt
- [x] La politique d'inscription (whitelist vs ouverte) est décidée — inscription ouverte avec confirmation email

---

## Ce qui est hors scope pour la v1.1.0

- Support iOS (prérequis payant, non prioritaire)
- Détection automatique du thème système
- Découverte sociale avancée (profil public, recherche géographique)
- Système de rôles admin/bibliothécaire complet (interface de gestion, whitelist dynamique, stats globales)
  - Le modèle `UserRole` (user/moderator/admin) et `get_current_moderator_user` existent déjà
  - Moderator : création/suppression auteurs, éditeurs, séries, genres (déjà en place)
  - Admin v1.1.0 minimum : désactiver un compte sans supprimer les données (support, compte compromis)
- **Gestion des revues et magazines (ISSN)**
  - Scanner/ajouter par ISSN (code-barres ou saisie manuelle)
  - Gérer des numéros spécifiques (titre de la série + numéro + date de parution)
  - Prêter des numéros comme les livres
  - Intégration dans le catalogue principal avec badge/filtre "Revue"
  - Récupération des métadonnées via Google Books (`issn:XXXX-XXXX`) ou OpenLibrary
