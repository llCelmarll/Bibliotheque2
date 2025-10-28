# 📊 Tests de Performance - Bibliotheque API

## 🎯 Vue d'ensemble

Cette suite de tests de performance utilise **Locust** pour mesurer les performances de l'API Bibliotheque sous charge.

## 🚀 Installation et Configuration

### Prérequis
```bash
pip install -r requirements.txt
```

### Démarrer l'API
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 📋 Scénarios de Test

### 1. **Authentification** (`auth_load`)
- **Objectif** : Tester les performances de registration/login
- **Utilisateurs** : 5
- **Durée** : 1 minute
- **Endpoints testés** :
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /books` (endpoint protégé)

### 2. **CRUD Livres** (`book_crud`)
- **Objectif** : Tester les opérations CRUD sur les livres
- **Utilisateurs** : 10
- **Durée** : 2 minutes
- **Endpoints testés** :
  - `GET /books` (liste)
  - `POST /books` (création)
  - `GET /books/{id}` (détail)
  - `PUT /books/{id}` (mise à jour)
  - `GET /books/search` (recherche)

### 3. **Scanning ISBN** (`scan_load`)
- **Objectif** : Tester les performances de scanning avec APIs externes
- **Utilisateurs** : 3 (moins car appels externes)
- **Durée** : 1 minute
- **Endpoints testés** :
  - `GET /scan/isbn/{isbn}`
  - `GET /scan/barcode/{barcode}`

### 4. **Workflow Mixte** (`mixed_workflow`)
- **Objectif** : Simuler un usage réaliste de l'application
- **Utilisateurs** : 15
- **Durée** : 3 minutes
- **Actions** : Navigation, recherche, scanning, création

## 🛠️ Utilisation

### Lancer un scénario spécifique
```bash
python tests/performance/run_performance_tests.py mixed_workflow
```

### Avec interface web Locust
```bash
python tests/performance/run_performance_tests.py --ui mixed_workflow
```
Interface disponible sur : http://localhost:8089

### Lister tous les scénarios
```bash
python tests/performance/run_performance_tests.py list
```

### Exécution directe avec Locust
```bash
# Mode headless
locust -f tests/performance/test_book_performance.py --host=http://localhost:8000 --users=10 --spawn-rate=2 --run-time=2m --headless

# Mode interface web
locust -f tests/performance/test_mixed_workflow.py --host=http://localhost:8000
```

## 📊 Métriques Importantes

### Métriques à surveiller :
- **RPS (Requests Per Second)** : Débit de requêtes
- **Response Time** : Temps de réponse (moyenne, médiane, P95, P99)
- **Error Rate** : Taux d'erreur
- **Concurrent Users** : Utilisateurs simultanés supportés

### Seuils recommandés :
- ✅ **Temps de réponse P95 < 500ms** pour les endpoints CRUD
- ✅ **Temps de réponse P95 < 2000ms** pour le scanning (APIs externes)
- ✅ **Taux d'erreur < 1%**
- ✅ **Support de 20+ utilisateurs simultanés**

## 🔧 Configuration Avancée

### Modifier les paramètres dans `config.py`
```python
SCENARIOS["custom"] = {
    "file": "test_book_performance.py",
    "users": 20,
    "spawn_rate": 5, 
    "run_time": "5m"
}
```

### Variables d'environnement
```bash
export LOCUST_HOST=http://localhost:8000
export LOCUST_USERS=15
export LOCUST_SPAWN_RATE=3
```

## 📈 Analyse des Résultats

### Rapport automatique
Les tests génèrent automatiquement :
- **Statistiques détaillées** en console
- **Fichiers de logs** pour analyse approfondie
- **Graphiques de performance** (mode web)

### Optimisations suggérées
- **Database indexing** pour les requêtes de recherche
- **Connection pooling** pour la base de données
- **Caching** pour les données fréquemment accédées
- **Rate limiting** pour protéger les APIs externes

## 🚨 Résolution de Problèmes

### API non accessible
```
❌ Serveur non accessible sur http://localhost:8000
💡 Assurez-vous que l'API est démarrée avec: uvicorn app.main:app --reload
```

### Erreurs d'authentification
- Vérifier que les endpoints d'authentification fonctionnent
- Contrôler la validité des tokens JWT

### Performance dégradée
- Monitorer l'utilisation CPU/RAM
- Vérifier les logs d'erreur de l'application
- Analyser les requêtes SQL lentes

## 🔄 Intégration CI/CD

### GitHub Actions exemple
```yaml
name: Performance Tests
on: [push]
jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Performance Tests
        run: |
          pip install -r requirements.txt
          python tests/performance/run_performance_tests.py mixed_workflow
```