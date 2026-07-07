# Schéma de base de données

Ce diagramme est généré automatiquement à partir des modèles SQLModel du backend
(`backend/app/models/`) via [eralchemy2](https://github.com/Alexis-benoist/eralchemy2).
Il reflète le schéma réel de la base PostgreSQL, pas une version figée dans le temps.

Pour des vues plus lisibles par thème (avec les règles métier et contraintes
absentes d'un simple diagramme de colonnes) :

- [Schéma — Catalogue (livres, auteurs, éditeurs, genres, séries)](schemas/catalogue.md)
- [Schéma — Utilisateurs & sécurité](schemas/utilisateurs.md)
- [Schéma — Emprunts & prêts](schemas/emprunts.md)
- [Schéma — Contacts & invitations](schemas/contacts.md)
- [Schéma — Modération & administration](schemas/moderation.md)
- [Schéma — Notifications push](schemas/notifications.md)

## Régénérer ce diagramme

```bash
cd backend
pip install eralchemy2
python ../scripts/gen_schema_diagram.py
```

Le script importe tous les modèles pour peupler `SQLModel.metadata`, puis exporte
un bloc Mermaid `erDiagram` directement dans ce fichier (rendu nativement par GitHub,
sans dépendance à un service externe).

## Diagramme entité-relation

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
book_author_link {
 INTEGER author_id PK
   INTEGER book_id PK
}
book_genre_link {
 INTEGER book_id PK
   INTEGER genre_id PK
}
book_series_link {
 INTEGER book_id PK
   INTEGER series_id PK
   INTEGER volume_number 
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
authors {
 INTEGER id PK
   VARCHAR name 
}
publishers {
 INTEGER id PK
   VARCHAR name 
}
genres {
 INTEGER id PK
   VARCHAR name 
}
series {
 INTEGER id PK
   VARCHAR name 
}
email_verification_tokens {
 INTEGER id PK
   DATETIME created_at 
   DATETIME expires_at 
   VARCHAR token 
   BOOLEAN used 
   INTEGER user_id 
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
contact_invitations {
 INTEGER id PK
   DATETIME created_at 
   VARCHAR message 
   INTEGER recipient_id 
   DATETIME responded_at 
   INTEGER sender_id 
   VARCHAR status 
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
user_push_tokens {
 INTEGER id PK
   DATETIME created_at 
   VARCHAR platform 
   VARCHAR token 
   DATETIME updated_at 
   INTEGER user_id 
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
books ||--o{ book_author_link : has
authors ||--o{ book_author_link : has
genres ||--o{ book_genre_link : has
books ||--o{ book_genre_link : has
series ||--o{ book_series_link : has
books ||--o{ book_series_link : has
publishers |o--o{ books : has
genres |o--o{ books : has
users |o--o{ books : has
users ||--o{ email_verification_tokens : has
users ||--o{ audit_logs : has
books ||--o{ borrowed_books : has
contacts |o--o{ borrowed_books : has
users ||--o{ borrowed_books : has
users |o--o{ contacts : "linked to"
users ||--o{ contacts : "owns"
users ||--o{ contact_invitations : "sends"
users ||--o{ contact_invitations : "receives"
contacts ||--o{ loans : has
users ||--o{ loans : has
books ||--o{ loans : has
users ||--o{ password_reset_tokens : has
users |o--o{ reports : "reports"
users ||--o{ reports : "moderates"
users ||--o{ user_loan_requests : "requests"
users ||--o{ user_loan_requests : "lends"
books ||--o{ user_loan_requests : has
users ||--o{ user_push_tokens : has
users |o--o{ whitelist_entries : has
```

## Notes de lecture

- **`books`** est l'entité centrale : rattachée à un propriétaire (`owner_id` → `users`),
  un éditeur, un genre principal, et reliée en many-to-many aux auteurs (`book_author_link`),
  genres secondaires (`book_genre_link`) et séries (`book_series_link`).
- **Prêts** : le projet a deux mécanismes distincts —
  - `loans` / `borrowed_books` : suivi manuel des prêts consentis par le propriétaire (à un contact).
  - `user_loan_requests` : flux de demande d'emprunt entre utilisateurs de l'app (requester/lender),
    avec cycle de vie propre (demande → réponse → retour).
- **`contacts`** peut être lié à un compte utilisateur réel (`linked_user_id`) si la personne
  a aussi un compte sur l'app, sinon reste une fiche libre (nom/email/téléphone).
- **Tokens et sécurité** : `email_verification_tokens`, `password_reset_tokens` et
  `rate_limit_attempts` sont des tables techniques à durée de vie courte (purge possible après expiration).
- **Modération** : `reports` (signalements) et `audit_logs` (traçabilité des actions admin)
  soutiennent le panneau d'administration séparé (`frontend-admin/`).
