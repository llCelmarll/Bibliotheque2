# 🧪 Test de l'Ajout Manuel - Script de Validation

## Test via l'API directement

Voici un script de test pour valider que l'ajout manuel fonctionne correctement :

### 1. Test avec données minimales (titre seul)

```bash
curl -X POST "http://localhost:8000/books" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mon Livre de Test"
  }'
```

### 2. Test avec création d'entités automatique

```bash
curl -X POST "http://localhost:8000/books" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Livre avec Nouvelles Entités",
    "isbn": "9781234567890",
    "published_date": "2024",
    "page_count": 250,
    "authors": [{"name": "Nouvel Auteur Test"}],
    "publisher": {"name": "Nouvel Éditeur Test"},
    "genres": [{"name": "Nouveau Genre Test"}]
  }'
```

### 3. Test avec mélange entités existantes/nouvelles

```bash
curl -X POST "http://localhost:8000/books" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Livre Mixte",
    "authors": [1, {"name": "Auteur Totalement Nouveau"}],
    "publisher": {"name": "Éditeur Créé à la Volée"},
    "genres": [1, {"name": "Genre Inventé"}]
  }'
```

## Tests d'interface utilisateur

### Scénarios à tester :

1. **📱 Accès depuis l'onglet Scanner**
   - Ouvrir l'onglet Scanner
   - Cliquer sur le bouton "Ajout manuel" (en bas à droite)
   - Vérifier la navigation vers `/scan/manual`

2. **📚 Accès depuis l'onglet Livres**
   - Ouvrir l'onglet Livres
   - Cliquer sur le bouton "+" flottant (en bas à droite)
   - Vérifier la navigation vers `/scan/manual`

3. **📝 Ajout minimal**
   - Saisir uniquement un titre
   - Cliquer sur "Ajouter le livre"
   - Vérifier la création et la redirection

4. **🎯 Ajout complet**
   - Remplir tous les champs
   - Ajouter des auteurs (nouveaux)
   - Sélectionner/créer un éditeur
   - Ajouter des genres (nouveaux)
   - Valider l'ajout

5. **❌ Tests de validation**
   - Essayer d'ajouter sans titre (doit échouer)
   - Saisir un ISBN invalide
   - Saisir un nombre de pages négatif
   - Vérifier les messages d'erreur

## Résultats attendus

### ✅ Comportements corrects :
- Navigation fluide vers l'écran d'ajout manuel
- Formulaire vide pré-affiché
- Création automatique des nouvelles entités
- Messages de succès/erreur appropriés
- Possibilité de voir le livre créé ou d'en ajouter un autre

### ❌ Points d'attention :
- Performance de création des entités
- Gestion des doublons d'entités
- Validation des formats de date
- Gestion des erreurs réseau

## Checklist de test

- [ ] Navigation depuis Scanner
- [ ] Navigation depuis Livres  
- [ ] Ajout titre seul
- [ ] Ajout avec auteurs nouveaux
- [ ] Ajout avec éditeur nouveau
- [ ] Ajout avec genres nouveaux
- [ ] Validation titre vide
- [ ] Validation ISBN invalide
- [ ] Message de succès
- [ ] Navigation après ajout
- [ ] Performance acceptable

**Prêt pour les tests ! 🚀**