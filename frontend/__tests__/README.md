# Tests Frontend - Gestion des Prêts

Ce document décrit les tests créés pour les nouvelles fonctionnalités de gestion des prêts.

## Tests Créés

### 1. Tests de Composants

#### `LoanListItem.test.tsx`
Tests pour le composant d'affichage d'un prêt dans la liste :
- ✅ Affichage des informations du prêt (livre, emprunteur, dates)
- ✅ Affichage correct du statut (En cours, En retard, Retourné)
- ✅ Affichage du bouton "Retourner" pour les prêts actifs et en retard
- ✅ Non affichage du bouton pour les prêts retournés
- ✅ Navigation vers les détails du prêt
- ✅ Gestion des alertes sur mobile vs web
- ✅ Affichage des jours de retard
- ✅ Gestion des prêts sans date d'échéance

#### `BorrowerListItem.test.tsx`
Tests pour le composant d'affichage d'un emprunteur :
- ✅ Affichage du nom de l'emprunteur
- ✅ Affichage conditionnel des coordonnées (email, téléphone)
- ✅ Affichage conditionnel des statistiques (nombre de prêts actifs)
- ✅ Navigation vers les détails de l'emprunteur
- ✅ Gestion du singulier/pluriel pour les prêts
- ✅ Affichage "Aucun prêt en cours" quand active_loans_count = 0

### 2. Tests de Services

#### `loanService.test.ts`
Tests pour le service de gestion des prêts :
- ✅ Validation des données de prêt
  - Champs obligatoires (book_id, borrower)
  - Acceptation de borrower comme string ou number
  - Validation optionnelle (due_date, notes)
- ✅ Création de prêts (createLoan)
- ✅ Retour de livres (returnLoan)
- ✅ Récupération de prêts (getLoans, getLoansByBorrower)
- ✅ Récupération de statistiques
- ✅ Mise à jour et suppression de prêts
- ✅ Gestion des erreurs (livre déjà prêté, livre déjà retourné)

#### `borrowerService.test.ts`
Tests pour le service de gestion des emprunteurs :
- ✅ Création d'emprunteur
- ✅ Récupération de la liste des emprunteurs
- ✅ Vérification de la présence du champ `active_loans_count`
- ✅ Récupération d'un emprunteur par ID
- ✅ Mise à jour d'emprunteur
- ✅ Suppression d'emprunteur
- ✅ Recherche d'emprunteurs
- ✅ Gestion des erreurs (nom dupliqué, emprunteur avec prêts actifs)

### 3. Tests de Hooks

#### `useLoans.test.ts`
Tests pour le hook de gestion des prêts :
- ✅ Chargement automatique des prêts (autoLoad)
- ✅ Filtrage des prêts par statut
- ✅ Récupération des statistiques
- ✅ Rafraîchissement des données
- ✅ Gestion des erreurs
- ✅ Tri par défaut (OVERDUE → ACTIVE → RETURNED, puis par date)
- ✅ Tri par date au sein d'un même statut

## Exécution des Tests

```bash
# Exécuter tous les tests
cd frontend
npm test

# Exécuter les tests avec couverture
npm test -- --coverage

# Exécuter les tests en mode watch
npm test -- --watch

# Exécuter un fichier de test spécifique
npm test -- LoanListItem.test.tsx

# Exécuter les tests pour les loans uniquement
npm test -- loans
```

## Couverture des Tests

Les tests couvrent les fonctionnalités suivantes :

### Fonctionnalités Testées
1. **Affichage des prêts**
   - Liste des prêts avec tri intelligent
   - Détails d'un prêt
   - Badges de statut (actif, en retard, retourné)
   - Calcul des jours de retard

2. **Retour de livres**
   - Bouton de retour rapide
   - Confirmation (Alert sur mobile, window.confirm sur web)
   - Mise à jour du statut

3. **Statistiques des emprunteurs**
   - Comptage des prêts actifs (`active_loans_count`)
   - Affichage dans la liste des emprunteurs
   - Mise à jour automatique lors des changements

4. **Tri et filtrage**
   - Tri par priorité de statut (OVERDUE > ACTIVE > RETURNED)
   - Tri par date au sein d'un même statut
   - Filtrage par statut

## Mocks Utilisés

### API Client Mock
Tous les services utilisent un mock du client API :
```typescript
jest.mock('../../services/api/client', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  },
}));
```

### Platform Mock
Les composants utilisent un mock de Platform pour tester le comportement sur mobile et web.

## Améliorations Futures

- [ ] Tests E2E avec Detox ou Appium
- [ ] Tests de performance pour les listes longues
- [ ] Tests d'accessibilité
- [ ] Tests de snapshots pour les composants UI
- [ ] Tests d'intégration entre composants

## Structure des Fichiers de Test

```
frontend/__tests__/
├── components/
│   └── loans/
│       ├── LoanListItem.test.tsx
│       └── BorrowerListItem.test.tsx
├── services/
│   ├── loanService.test.ts
│   └── borrowerService.test.ts
├── hooks/
│   └── useLoans.test.ts
└── README.md (ce fichier)
```

## Notes Importantes

1. **Mocking du client API** : Les tests mock le client API au niveau le plus bas pour éviter les problèmes d'interceptors axios.

2. **Platform-specific code** : Les tests vérifient le bon fonctionnement sur mobile et web en mockant `Platform.OS`.

3. **TextID** : Les composants utilisent des `testID` pour faciliter les tests (format : `component-item-{id}`).

4. **Assertions de texte** : Les tests vérifient le texte exact affiché à l'utilisateur pour garantir une bonne UX.
