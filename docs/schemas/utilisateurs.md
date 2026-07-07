# Schéma — Utilisateurs & sécurité

Le compte utilisateur et tout ce qui gère son cycle de vie sécurité : vérification d'email, réinitialisation de mot de passe, rate limiting anti brute-force, whitelist d'inscription.

[⬅ Retour au schéma complet](../schema_bdd.md)

```mermaid
%%{init: {"layout": "elk"}}%%
erDiagram
users {
 INTEGER id PK
   DATETIME consent_accepted_at 
   VARCHAR consent_version 
   DATETIME created_at 
   VARCHAR email 
   DATETIME email_verified_at 
   VARCHAR hashed_password 
   BOOLEAN is_active 
   JSON push_prefs 
   VARCHAR role 
   VARCHAR username 
}
email_verification_tokens {
 INTEGER id PK
   DATETIME created_at 
   DATETIME expires_at 
   VARCHAR token 
   BOOLEAN used 
   INTEGER user_id 
}
password_reset_tokens {
 INTEGER id PK
   DATETIME created_at 
   DATETIME expires_at 
   VARCHAR token 
   BOOLEAN used 
   INTEGER user_id 
}
rate_limit_attempts {
 INTEGER id PK
   DATETIME attempted_at 
   VARCHAR endpoint 
   VARCHAR ip 
}
whitelist_entries {
 INTEGER id PK
   DATETIME added_at 
   INTEGER added_by_id 
   VARCHAR email 
}
users ||--o{ email_verification_tokens : has
users ||--o{ password_reset_tokens : has
users |o--o{ whitelist_entries : has
```

## Contraintes et règles invisibles sur le diagramme

- **`users.role`** est un `VARCHAR` en base mais un enum applicatif à 3 valeurs :
  `user`, `moderator`, `admin` (défaut `user`).
- **Whitelist d'inscription** (`is_email_allowed()`, `backend/app/config/whitelist.py`) :
  si la table `whitelist_entries` contient des entrées, seuls ces emails (ou domaines
  `@domaine.com`) peuvent s'inscrire ; sinon repli sur la variable d'env `ALLOWED_EMAILS` ;
  si aucune des deux n'est renseignée, l'inscription est ouverte à tous.
- **`users.is_active=False`** bloque la connexion (suspension de compte par un admin).
- **`waitlist_entries.status`** est un enum applicatif (`pending`/`invited`/`rejected`,
  défaut `pending`), `email` unique.
- **Droits d'administration** : un modérateur ne peut pas modifier son propre compte ;
  seul un `admin` peut changer un rôle ou supprimer un compte. Chaque action
  (suspension, changement de rôle, whitelist) est tracée dans `audit_logs`.
- **Tokens à usage unique** : `email_verification_tokens` et `password_reset_tokens`
  ont un flag `used` et une `expires_at` — ce sont des tables techniques à durée de
  vie courte, purgeables après expiration.
