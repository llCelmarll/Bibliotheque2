# Schéma — Catalogue (livres, auteurs, éditeurs, genres, séries)

Le cœur du catalogue : un livre appartient à un utilisateur, a un éditeur et un genre principal, et est relié en many-to-many aux auteurs, genres secondaires et séries.

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
books ||--o{ book_author_link : has
authors ||--o{ book_author_link : has
genres ||--o{ book_genre_link : has
books ||--o{ book_genre_link : has
series ||--o{ book_series_link : has
books ||--o{ book_series_link : has
publishers |o--o{ books : has
genres |o--o{ books : has
users |o--o{ books : has
```

## Contraintes et règles invisibles sur le diagramme

- **Unicité** : `books` est unique par `(title, isbn, owner_id)` — deux utilisateurs
  peuvent posséder le même livre, mais pas en double pour un même propriétaire.
  `authors.name`, `publishers.name`, `genres.name`, `series.name` sont en revanche
  **uniques globalement** (toutes bibliothèques confondues) : les livres de plusieurs
  utilisateurs partagent la même ligne auteur/éditeur/genre/série en base.
- **`books.reading_status`** est un `VARCHAR` en base mais un enum applicatif à 3
  valeurs (`read` / `unread` / `in_progress`, `backend/app/schemas/book_schemas.py`).
- **`books.rating`** : pas de contrainte SQL, mais borné 0–5 en validation applicative
  (`BookService._validate_rating`) ; `0` signifie "non renseigné".
- **`books.isbn`** : doit faire 10 ou 13 caractères une fois les tirets retirés
  (vérifié en code, pas en base).
- **`books.is_lendable`** (`default=True`) conditionne si le livre est proposable au
  prêt inter-membres (voir [emprunts.md](emprunts.md)).
- **Cascade** : supprimer un `Book` supprime en cascade ses `Loan` et `BorrowedBook`
  (cascade ORM SQLAlchemy, pas une contrainte `ON DELETE` en base).
- **Fusion d'entités** : le panneau admin permet de fusionner deux auteurs/éditeurs/
  genres/séries en doublon (réattribution des liens puis suppression de la source),
  tracé dans `audit_logs` (`action="merge_entity"`).
