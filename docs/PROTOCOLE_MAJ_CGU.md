# Protocole de mise à jour des CGU et de la Politique de confidentialité

## Format de version

`YYYY-MM` (ex : `2026-07`). La date du mois de publication suffit pour identifier une version.

La version est stockée dans deux endroits — ils doivent toujours être **identiques** :
- `.env.synology` → `CGU_VERSION=2026-07` (lu par le backend)
- `frontend/config/api.ts` → `CGU_VERSION: '2026-07'` (lu par le frontend)

---

## Quand bumper la version ?

**Bumper obligatoirement** si les modifications sont substantielles :
- Nouvelles données personnelles collectées
- Nouveaux tiers sous-traitants (ex : nouveau service email, analytics)
- Modification des droits des utilisateurs
- Changement de finalité du traitement des données
- Modification des durées de conservation

**Ne pas bumper** pour :
- Corrections de fautes d'orthographe ou de grammaire
- Reformulations qui ne changent pas le sens
- Mises en forme

---

## Comment bumper (automatique via le script de déploiement)

Le script `scripts/deploy/deploy-all.ps1` détecte automatiquement si `docs/CGU.md` ou `docs/POLITIQUE_CONFIDENTIALITE.md` ont été modifiés depuis le dernier déploiement.

Si des modifications sont détectées, il propose de bumper :

```
  AVERTISSEMENT : Documents légaux modifiés :
    - docs/CGU.md

  Si ces modifications sont substantielles [...], il faut bumper
  la version CGU pour forcer le re-consentement de tous les utilisateurs.

  Bumper la version CGU maintenant ? (O/N)
```

Répondre **O** met automatiquement à jour `.env.synology` et `frontend/config/api.ts`, et force le redéploiement backend + web.

---

## Comment bumper manuellement

1. Modifier `.env.synology` : remplacer `CGU_VERSION=XXXX-XX` par la nouvelle date
2. Modifier `frontend/config/api.ts` : remplacer `CGU_VERSION: 'XXXX-XX'` par la même date
3. Commiter les deux fichiers avec les modifications des CGU/politique
4. Lancer `deploy-all.ps1` (redéploiera backend + web)

---

## Ce qui se passe pour les utilisateurs

- À la prochaine connexion, si `user.consent_version != CGU_VERSION` (ou si null), le backend retourne `requires_consent_update: true`
- L'application affiche une **modale obligatoire** : l'utilisateur doit accepter les nouvelles CGU pour continuer
- S'il refuse, il est déconnecté
- Une fois accepté, `user.consent_version` et `user.consent_accepted_at` sont mis à jour en base

---

## Rollback

Si une version CGU a été bumée par erreur :
1. Remettre l'ancienne valeur dans `.env.synology` et `frontend/config/api.ts`
2. Redéployer le backend + web (`deploy-all.ps1 -ForceBackend -ForceWeb`)

Les utilisateurs qui ont déjà accepté la nouvelle version ne sont pas impactés (leur `consent_version` est à jour).
