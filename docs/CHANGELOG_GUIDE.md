# Guide du CHANGELOG.json

## Versionnage : Versions narratives (Option A)

Les numéros de version dans `CHANGELOG.json` sont **indépendants** de la version technique de l'app (`app.config.js`).
Ils servent uniquement à informer l'utilisateur de manière lisible.

### Règle de numérotation

| Incrément | Quand l'utiliser |
|-----------|-----------------|
| `MINOR` (+0.1.0) | Nouvelle fonctionnalité significative visible par l'utilisateur (ex: système de prêts, gestion des comptes) |
| `PATCH` (+0.0.1) | Petite fonctionnalité, amélioration, ou correction notable (ex: photo de couverture, rappels calendrier) |
| `MAJOR` (+1.0.0) | Refonte majeure de l'app (rare) |

### Règles importantes

- Toujours ajouter la **nouvelle entrée en tête** du tableau (ordre antéchronologique)
- La version de la nouvelle entrée doit être **supérieure** à celle de l'entrée suivante
- Ne **pas** aligner sur la version de `app.config.js` — ce sont deux systèmes indépendants
- Le script `deploy-all.ps1` propose d'ajouter une entrée automatiquement (prompt interactif)

### Exemple

```
v1.3.0  ← nouvelle grosse feature
v1.2.0  ← feature précédente
v1.1.0  ← ...
v1.0.3  ← petite feature
v1.0.2  ← petite feature
v1.0.1  ← petite feature
v1.0.0  ← version initiale
```
