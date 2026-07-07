# Schéma — Modération & administration

Signalements (`reports`) et traçabilité des actions admin (`audit_logs`), plus les listes de contrôle d'accès (`whitelist_entries`) et la liste d'attente d'inscription (`waitlist_entries`). Support du panneau d'administration séparé (`frontend-admin/`).

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
audit_logs {
 INTEGER id PK
   VARCHAR action 
   INTEGER actor_id 
   DATETIME created_at 
   JSON detail 
   INTEGER target_id 
   VARCHAR target_type 
}
reports {
 INTEGER id PK
   DATETIME created_at 
   VARCHAR description 
   INTEGER moderator_id 
   VARCHAR moderator_note 
   VARCHAR reason 
   INTEGER reporter_id 
   DATETIME resolved_at 
   VARCHAR status 
   INTEGER target_id 
   VARCHAR target_type 
}
waitlist_entries {
 INTEGER id PK
   DATETIME created_at 
   VARCHAR email 
   TEXT message 
   VARCHAR name 
   VARCHAR referred_by 
   VARCHAR status 
}
whitelist_entries {
 INTEGER id PK
   DATETIME added_at 
   INTEGER added_by_id 
   VARCHAR email 
}
users ||--o{ audit_logs : has
users |o--o{ reports : "reports"
users ||--o{ reports : "moderates"
users |o--o{ whitelist_entries : has
```

## Contraintes et règles invisibles sur le diagramme

- **`reports`** a 3 enums applicatifs : `target_type` (`book`/`note`/`user`),
  `reason` (`inappropriate`/`spam`/`wrong_info`/`other`), `status`
  (`pending`/`resolved`/`rejected`, défaut `pending`).
- **`reports.target_id` est une référence polymorphe** : simple `INTEGER` sans FK
  réelle en base, résolu applicativement selon `target_type` — un signalement peut
  pointer vers un livre, une note ou un utilisateur déjà supprimé sans erreur SQL.
- **Résolution stricte** : un signalement ne peut passer que de `pending` à `resolved`
  ou `rejected`, toujours par un modérateur, jamais en sens inverse.
- **`audit_logs.action`** est une convention de code (pas un enum ni une contrainte
  CHECK) restreinte en pratique à : `suspend_user`, `delete_user`, `resolve_report`,
  `reject_report`, `merge_entity`, `change_role`, `whitelist_add`, `whitelist_remove`.
  La table est **append-only** : aucune route ne modifie ou supprime une entrée.
- **Droits d'accès** : lecture des signalements et actions courantes accessibles aux
  `moderator` et `admin` ; suppression de compte et gestion de la whitelist réservées
  aux `admin` uniquement.
