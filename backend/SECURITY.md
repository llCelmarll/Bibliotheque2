# Sécurité de l'authentification

## 🔒 Mesures de sécurité implémentées

### 1. Whitelist d'emails
- Seuls les emails autorisés peuvent créer un compte
- Configuration dans `app/config/whitelist.py`
- Support des emails individuels et des domaines complets

### 2. Rate Limiting
- **Login**: Maximum 10 tentatives par 15 minutes par IP
- **Register**: Maximum 3 tentatives par 15 minutes par IP
- Protection contre les attaques brute force

### 3. Validation stricte des mots de passe
- Minimum 8 caractères
- Au moins 1 majuscule
- Au moins 1 minuscule
- Au moins 1 chiffre

### 4. Validation des emails
- Format d'email valide requis
- Vérification d'unicité (un email = un seul compte)

### 5. Validation des usernames
- Minimum 3 caractères
- Uniquement lettres, chiffres, tirets et underscores

### 6. Messages d'erreur explicites
- "Cette adresse email n'est pas autorisée à créer un compte"
- "Un compte avec cette adresse email existe déjà"
- "Le mot de passe doit contenir au moins une majuscule"
- etc.

## 📝 Gestion de la whitelist

Les emails autorisés sont gérés via la table `whitelist_entries` en base, administrable
depuis le panneau d'administration (`frontend-admin/`) ou directement via l'API :

```bash
# Lister les emails autorisés
GET /admin/whitelist

# Ajouter un email autorisé
POST /admin/whitelist
{"email": "user@example.com"}

# Retirer un email
DELETE /admin/whitelist/{email}
```

Ces routes nécessitent un compte `admin` et chaque action est tracée dans `audit_logs`
(`whitelist_add` / `whitelist_remove`, voir `backend/app/routers/admin.py`).

### Repli via variable d'environnement (legacy)

Si la table `whitelist_entries` est vide, le système retombe sur la variable d'env
`ALLOWED_EMAILS` (`backend/app/config/whitelist.py`) :

```bash
# Format: emails séparés par des virgules, dans backend/.env
ALLOWED_EMAILS=user1@example.com,user2@example.com,@mondomaine.com
```

**Syntaxe supportée**:
- Email unique: `user@example.com`
- Plusieurs emails: `user1@example.com,user2@example.com`
- Domaine complet: `@mondomaine.com` (autorise tous les emails du domaine)
- Mixte: `user1@example.com,@mondomaine.com`

Si ni la table ni `ALLOWED_EMAILS` ne sont renseignées, l'inscription est ouverte à tous.

## 🚀 Configuration Cloudflare recommandée

Avec cette sécurité renforcée, vous pouvez **supprimer le blocage IP** sur Cloudflare :

1. **Supprimer** la règle "Block rest" (blocage par IP)
2. **Garder** la règle "IP Whitelist" en mode "Skip" (optionnel, pour éviter les captchas)
3. **Ajouter** une règle de Rate Limiting Cloudflare (optionnel, doublon de sécurité):
   - Path: `/api/auth/*`
   - Rate: 30 requêtes / minute / IP

### Avantages de l'accès public + authentification :
- ✅ Fonctionne partout (WiFi, 4G, 5G)
- ✅ Pas besoin de whitelister les IPs mobiles changeantes
- ✅ Sécurité assurée par l'authentification applicative
- ✅ Rate limiting pour prévenir les abus
- ✅ Whitelist d'emails pour contrôler les inscriptions

## 🧪 Tests

### Tester le rate limiting login
```bash
# Faire 11 tentatives rapidement (la 11ème sera bloquée)
for i in {1..11}; do
  curl -X POST https://mabibliotheque.ovh/api/auth/login-json \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpass"}'
  echo "\nTentative $i"
done
```

### Tester la whitelist
```bash
# Email non autorisé (devrait échouer)
curl -X POST https://mabibliotheque.ovh/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"hacker@evil.com","username":"hacker","password":"Test1234"}'

# Email autorisé (devrait réussir)
curl -X POST https://mabibliotheque.ovh/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"celmar@exemple.com","username":"celmar","password":"Test1234"}'
```

## 📊 Monitoring

Les tentatives de login/register sont trackées en mémoire. Pour un monitoring persistant en production, considérez:
- Redis pour le rate limiting distribué
- Logs des tentatives échouées
- Alertes email pour activités suspectes

## ⚠️ Important

**Avant de déployer**, configurez la whitelist avec les vrais emails via le panneau
d'administration (`POST /admin/whitelist`), ou en repli via `.env` :
```bash
ALLOWED_EMAILS=votre.email@gmail.com,email.mere@gmail.com
```

**SÉCURITÉ**: Ne committez JAMAIS le fichier `.env` dans Git ! Il contient des données sensibles.
Le fichier `.gitignore` doit contenir `.env`.

## 🔄 Migration depuis le système actuel

1. Ajouter les emails autorisés à la whitelist
2. Tester en local que le register fonctionne
3. Déployer le backend
4. Retirer progressivement les règles IP Cloudflare:
   - Commencer par retirer "Block rest"
   - Garder "IP Whitelist" en skip pendant quelques jours
   - Supprimer complètement après validation
