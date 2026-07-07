# Schéma — Emprunts & prêts

Deux mécanismes de prêt coexistent : `loans`/`borrowed_books` pour le suivi manuel des prêts consentis par le propriétaire à un contact, et `user_loan_requests` pour le flux de demande d'emprunt entre deux utilisateurs de l'app (requester/lender).

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
books {
 INTEGER id PK
   VARCHAR barcode 
   VARCHAR cover_url 
   DATETIME created_at 
   INTEGER genre_id 
   BOOLEAN is_lendable 
   VARCHAR isbn 
   TEXT notes 
   INTEGER owner_id 
   INTEGER page_count 
   VARCHAR published_date 
   INTEGER publisher_id 
   INTEGER rating 
   DATETIME read_date 
   VARCHAR reading_status 
   VARCHAR subtitle 
   VARCHAR title 
   DATETIME updated_at 
}
borrowed_books {
 INTEGER id PK
   DATETIME actual_return_date 
   INTEGER book_id 
   DATETIME borrowed_date 
   VARCHAR borrowed_from 
   VARCHAR calendar_event_id 
   INTEGER contact_id 
   DATETIME created_at 
   DATETIME expected_return_date 
   VARCHAR notes 
   VARCHAR status 
   DATETIME updated_at 
   INTEGER user_id 
}
contacts {
 INTEGER id PK
   DATETIME created_at 
   VARCHAR email 
   BOOLEAN library_shared 
   INTEGER linked_user_id 
   VARCHAR name 
   VARCHAR notes 
   INTEGER owner_id 
   VARCHAR phone 
}
loans {
 INTEGER id PK
   INTEGER book_id 
   VARCHAR calendar_event_id 
   INTEGER contact_id 
   DATETIME due_date 
   DATETIME loan_date 
   VARCHAR notes 
   INTEGER owner_id 
   DATETIME return_date 
   VARCHAR status 
}
user_loan_requests {
 INTEGER id PK
   INTEGER book_id 
   DATETIME created_at 
   DATETIME due_date 
   INTEGER lender_id 
   VARCHAR message 
   DATETIME request_date 
   INTEGER requester_id 
   DATETIME response_date 
   VARCHAR response_message 
   DATETIME return_date 
   VARCHAR status 
   DATETIME updated_at 
}
users |o--o{ books : has
books ||--o{ borrowed_books : has
contacts |o--o{ borrowed_books : has
users ||--o{ borrowed_books : has
users |o--o{ contacts : "linked to"
users ||--o{ contacts : "owns"
contacts ||--o{ loans : has
users ||--o{ loans : has
books ||--o{ loans : has
users ||--o{ user_loan_requests : "requests"
users ||--o{ user_loan_requests : "lends"
books ||--o{ user_loan_requests : has
```

## Contraintes et règles invisibles sur le diagramme

- **`status` est un enum recalculé, pas une valeur figée** : `loans.status` et
  `borrowed_books.status` (`active`/`returned`/`overdue`) sont repassés de `active`
  à `overdue` **à chaque lecture** si la date d'échéance est dépassée (avec
  persistance immédiate) — ce n'est pas un flag qu'on met à jour manuellement.
  `user_loan_requests.status` a 5 valeurs : `pending`, `accepted`, `declined`,
  `cancelled`, `returned`.
- **Machine à états stricte sur `user_loan_requests`** : création refusée si le livre
  n'est pas `is_lendable`, si le prêteur n'a pas de `Contact` avec `library_shared=True`
  vers ce demandeur, ou si une demande `pending`/un prêt actif existe déjà sur ce
  livre. `accept`/`decline` réservés au `lender_id`, `cancel` au `requester_id`,
  toujours depuis `pending`. Le retour n'est possible que depuis `accepted`.
- **Exclusivité mutuelle** : un `Loan` classique et une `UserLoanRequest` acceptée ne
  peuvent pas coexister sur le même livre — chaque création vérifie l'absence de
  l'autre mécanisme actif.
- **Rappels automatiques** : un scheduler notifie par push 48h avant l'échéance des
  `Loan` et `UserLoanRequest` actifs — ce rappel n'a pas de `notification_type` et
  échappe donc au filtre `users.push_prefs` (voir [notifications.md](notifications.md)).
- **`borrowed_books.borrowed_from`** est un champ texte legacy conservé en parallèle
  de `contact_id` pour rétrocompatibilité.
