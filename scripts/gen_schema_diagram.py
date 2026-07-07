"""Regenerate Mermaid ER diagrams from the SQLModel models.

Generates the full schema (docs/schema_bdd.md) plus one focused diagram per
theme (docs/schemas/*.md) — books, users, loans, contacts, moderation,
notifications — so each one stays readable instead of showing all 22 tables
at once.

Note: docs/schemas/ also holds base.pgerd, a pgAdmin-native ERD save file —
unrelated to these Markdown/Mermaid diagrams, left untouched by this script.

Usage:
    cd backend
    python ../scripts/gen_schema_diagram.py

Requires eralchemy2 (pip install eralchemy2). Does not need a live database
connection: it only inspects SQLModel.metadata after importing every model.
"""
import os
import re
import sys

BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(BACKEND_DIR))

from sqlmodel import SQLModel

# Import every model module so its table registers on SQLModel.metadata.
from app.models.audit_log_model import AuditLog  # noqa: F401
from app.models.author_model import Author  # noqa: F401
from app.models.book_model import Book  # noqa: F401
from app.models.book_author_link_model import BookAuthorLink  # noqa: F401
from app.models.book_genre_link_model import BookGenreLink  # noqa: F401
from app.models.book_series_link_model import BookSeriesLink  # noqa: F401
from app.models.borrowed_book_model import BorrowedBook  # noqa: F401
from app.models.contact_model import Contact  # noqa: F401
from app.models.contact_invitation_model import ContactInvitation  # noqa: F401
from app.models.email_verification_token_model import EmailVerificationToken  # noqa: F401
from app.models.genre_model import Genre  # noqa: F401
from app.models.loan_model import Loan  # noqa: F401
from app.models.password_reset_token_model import PasswordResetToken  # noqa: F401
from app.models.publisher_model import Publisher  # noqa: F401
from app.models.rate_limit_attempt_model import RateLimitAttempt  # noqa: F401
from app.models.report_model import Report  # noqa: F401
from app.models.series_model import Series  # noqa: F401
from app.models.user_model import User  # noqa: F401
from app.models.user_loan_request_model import UserLoanRequest  # noqa: F401
from app.models.user_push_token_model import UserPushToken  # noqa: F401
from app.models.waitlist_entry_model import WaitlistEntry  # noqa: F401
from app.models.whitelist_entry_model import WhitelistEntry  # noqa: F401

from eralchemy2 import render_er

DOCS_DIR = os.path.join(os.path.dirname(__file__), "..", "docs")
SCHEMA_DIR = os.path.join(DOCS_DIR, "schemas")

# Each focused diagram: (filename, title, intro, tables)
THEMES = [
    (
        "catalogue.md",
        "Schéma — Catalogue (livres, auteurs, éditeurs, genres, séries)",
        "Le cœur du catalogue : un livre appartient à un utilisateur, a un éditeur "
        "et un genre principal, et est relié en many-to-many aux auteurs, genres "
        "secondaires et séries.",
        ["books", "authors", "publishers", "genres", "series",
         "book_author_link", "book_genre_link", "book_series_link", "users"],
        """## Contraintes et règles invisibles sur le diagramme

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
""",
    ),
    (
        "utilisateurs.md",
        "Schéma — Utilisateurs & sécurité",
        "Le compte utilisateur et tout ce qui gère son cycle de vie sécurité : "
        "vérification d'email, réinitialisation de mot de passe, rate limiting "
        "anti brute-force, whitelist d'inscription.",
        ["users", "email_verification_tokens", "password_reset_tokens",
         "rate_limit_attempts", "whitelist_entries"],
        """## Contraintes et règles invisibles sur le diagramme

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
""",
    ),
    (
        "emprunts.md",
        "Schéma — Emprunts & prêts",
        "Deux mécanismes de prêt coexistent : `loans`/`borrowed_books` pour le suivi "
        "manuel des prêts consentis par le propriétaire à un contact, et "
        "`user_loan_requests` pour le flux de demande d'emprunt entre deux "
        "utilisateurs de l'app (requester/lender).",
        ["loans", "borrowed_books", "user_loan_requests", "contacts", "books", "users"],
        """## Contraintes et règles invisibles sur le diagramme

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
""",
    ),
    (
        "contacts.md",
        "Schéma — Contacts & invitations",
        "Un contact peut être une fiche libre (nom/email/téléphone) ou être lié à "
        "un compte utilisateur réel via `linked_user_id`. Les invitations "
        "permettent à deux utilisateurs de se relier.",
        ["contacts", "contact_invitations", "users"],
        """## Contraintes et règles invisibles sur le diagramme

- **Unicité** : `contacts` est unique par `(name, owner_id)` — le nom n'a besoin
  d'être unique que dans la bibliothèque d'un même propriétaire.
- **`library_shared`** ne peut être activé que si `linked_user_id` est déjà renseigné ;
  ce flag conditionne l'autorisation d'emprunt inter-membres.
- **Contact miroir bidirectionnel** : quand une invitation est acceptée, un `Contact`
  est créé automatiquement **des deux côtés** (chacun pointant vers l'autre via
  `linked_user_id`), pas juste une relation à sens unique.
- **Suppression protégée** : impossible de supprimer un contact ayant un prêt actif/en
  retard, ou une demande d'emprunt inter-membres acceptée. Si le contact est lié à un
  compte, ses demandes en attente sont auto-annulées et le contact miroir chez l'autre
  utilisateur est supprimé aussi.
- **`contact_invitations.status`** est un enum applicatif : `pending`, `accepted`,
  `declined`, `cancelled`. Auto-invitation interdite, une seule invitation `pending`
  possible entre deux utilisateurs (dans un sens ou l'autre), et impossible si les
  deux sont déjà liés.
""",
    ),
    (
        "moderation.md",
        "Schéma — Modération & administration",
        "Signalements (`reports`) et traçabilité des actions admin (`audit_logs`), "
        "plus les listes de contrôle d'accès (`whitelist_entries`) et la liste "
        "d'attente d'inscription (`waitlist_entries`). Support du panneau "
        "d'administration séparé (`frontend-admin/`).",
        ["reports", "audit_logs", "whitelist_entries", "waitlist_entries", "users"],
        """## Contraintes et règles invisibles sur le diagramme

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
""",
    ),
    (
        "notifications.md",
        "Schéma — Notifications push",
        "Un utilisateur peut enregistrer plusieurs tokens push (un par appareil/plateforme).",
        ["user_push_tokens", "users"],
        """## `users.push_prefs`

Colonne JSON libre (pas de table dédiée) : `{type_evenement: bool}`, `true` par défaut
si la clé est absente. Utilisée pour désactiver certains types de notification sans
toucher aux tokens eux-mêmes.

Types d'événement actuellement émis par le backend (`_fire_push(..., notification_type=...)`) :

| Type | Émis par |
|------|----------|
| `contact_invitation` | Réception d'une invitation de contact |
| `contact_accepted` | Une invitation envoyée a été acceptée |
| `loan_request` | Réception d'une demande d'emprunt |
| `loan_accepted` | Une demande d'emprunt envoyée a été acceptée |
| `loan_declined` | Une demande d'emprunt envoyée a été refusée |

Exemple : `{"loan_request": false}` désactive uniquement les notifications de demande
d'emprunt, tout le reste reste actif par défaut.

**Cas particulier** : les rappels d'échéance à 48h (voir [emprunts.md](emprunts.md))
sont envoyés sans `notification_type` — ils ne sont donc **jamais filtrables** via
`push_prefs`, contrairement aux 5 types ci-dessus.

Autres contraintes non visibles sur le diagramme :
- `user_push_tokens.token` est unique en base.
- Un token doit commencer par `ExponentPushToken[` pour être utilisé à l'envoi (vérifié
  en code, pas en base) — les tokens mal formés sont ignorés silencieusement.
- La variable d'environnement `PUSH_NOTIFICATIONS_ENABLED` coupe l'envoi de toutes les
  notifications indépendamment de `push_prefs`.

API : `GET/PUT /push-tokens/prefs` (voir `backend/app/routers/push_tokens.py`).
""",
    ),
]


def render_mermaid_body(include_tables=None):
    """Render SQLModel.metadata to a valid, deduplicated Mermaid erDiagram body."""
    tmp_path = os.path.join(DOCS_DIR, "_tmp_erd.md")
    render_er(SQLModel.metadata, tmp_path, mode="mermaid_er", include_tables=include_tables)

    with open(tmp_path, "r", encoding="utf-8") as f:
        raw = f.read()
    os.remove(tmp_path)

    # eralchemy2's mermaid_er mode wraps the diagram in an HTML comment followed
    # by a mermaid.ink image link. Keep only the erDiagram body.
    match = re.search(r"erDiagram\n(.*?)\n\n-->", raw, re.DOTALL)
    if not match:
        raise RuntimeError("Could not find erDiagram block in eralchemy2 output")
    # The ELK layout engine routes edges around table boxes instead of through
    # them, which Mermaid's default dagre layout does on diagrams this dense.
    body = "%%{init: {\"layout\": \"elk\"}}%%\nerDiagram\n" + match.group(1)

    # eralchemy2 emits its own cardinality notation (e.g. "1--0+", "one or
    # zero--0+"), which is not valid Mermaid erDiagram syntax. Convert to
    # Mermaid's crow's-foot notation so GitHub/Mermaid can actually render it.
    body = re.sub(r"^(\w+) 1--0\+ (\w+) : (\w+)$", r"\1 ||--o{ \2 : \3", body, flags=re.MULTILINE)
    body = re.sub(r"^(\w+) one or zero--0\+ (\w+) : (\w+)$", r"\1 |o--o{ \2 : \3", body, flags=re.MULTILINE)

    # A table can have two foreign keys to the same other table (e.g.
    # user_loan_requests.requester_id and .lender_id both pointing at users).
    # eralchemy2 emits both edges with the same generic "has" label, which
    # some Mermaid renderers choke on (duplicate edge => silent render failure).
    # Known pairs get a meaningful label below; anything new falls back to
    # numbering so it never silently breaks rendering again.
    # Order matters: eralchemy2 emits edges in the order it discovers the FK
    # columns on the model, which is the declaration order in the SQLModel
    # class, not alphabetical or by nullability. Verify against the model
    # (backend/app/models/) before assuming which line is which.
    KNOWN_LABELS = {
        ("users", "contacts"): ["linked to", "owns"],
        ("users", "contact_invitations"): ["sends", "receives"],
        ("users", "reports"): ["reports", "moderates"],
        ("users", "user_loan_requests"): ["requests", "lends"],
    }

    lines = body.split("\n")
    edge_re = re.compile(r"^(\w+) (\|\|--o\{|\|o--o\{) (\w+) : (\w+)$")
    seen = {}
    for i, line in enumerate(lines):
        m = edge_re.match(line)
        if not m:
            continue
        src, card, dst, label = m.groups()
        key = (src, dst)
        seen[key] = seen.get(key, 0) + 1
        occurrence = seen[key]
        if occurrence == 1:
            continue
        known = KNOWN_LABELS.get(key)
        new_label = known[occurrence - 1] if known and occurrence <= len(known) else f"{label} ({occurrence})"
        lines[i] = f"{src} {card} {dst} : \"{new_label}\""
    body = "\n".join(lines)

    # First occurrence of a known pair also gets its label upgraded (it was
    # left as the generic "has" above since only repeats get rewritten).
    for (src, dst), labels in KNOWN_LABELS.items():
        pattern = re.compile(rf"^{src} (\|\|--o\{{|\|o--o\{{) {dst} : has$", re.MULTILINE)
        body = pattern.sub(lambda m, l=labels[0]: f"{src} {m.group(1)} {dst} : \"{l}\"", body, count=1)

    return body


def write_full_schema():
    theme_links = "\n".join(
        f"- [{theme[1]}](schemas/{theme[0]})" for theme in THEMES
    )
    header = f"""# Schéma de base de données

Ce diagramme est généré automatiquement à partir des modèles SQLModel du backend
(`backend/app/models/`) via [eralchemy2](https://github.com/Alexis-benoist/eralchemy2).
Il reflète le schéma réel de la base PostgreSQL, pas une version figée dans le temps.

Pour des vues plus lisibles par thème (avec les règles métier et contraintes
absentes d'un simple diagramme de colonnes) :

{theme_links}

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
"""
    footer = """```

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
"""
    body = render_mermaid_body()
    output_path = os.path.join(DOCS_DIR, "schema_bdd.md")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(header)
        f.write(body)
        f.write("\n")
        f.write(footer)

    print(f"Wrote {output_path} ({len(SQLModel.metadata.tables)} tables)")


def write_theme_schemas():
    os.makedirs(SCHEMA_DIR, exist_ok=True)
    for theme in THEMES:
        filename, title, intro, tables = theme[:4]
        notes = theme[4] if len(theme) > 4 else None
        body = render_mermaid_body(include_tables=tables)
        output_path = os.path.join(SCHEMA_DIR, filename)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(f"# {title}\n\n")
            f.write(f"{intro}\n\n")
            f.write("[⬅ Retour au schéma complet](../schema_bdd.md)\n\n")
            f.write("```mermaid\n")
            f.write(body)
            f.write("\n```\n")
            if notes:
                f.write(f"\n{notes}")
        print(f"Wrote {output_path} ({len(tables)} tables)")


def main():
    write_full_schema()
    write_theme_schemas()


if __name__ == "__main__":
    main()
