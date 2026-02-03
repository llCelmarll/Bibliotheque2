"""rename_borrowers_to_contacts

Revision ID: c1d2e3f4a5b6
Revises: 2fd88ac74072
Create Date: 2026-02-01 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = '2fd88ac74072'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite ne supporte pas ALTER TABLE RENAME COLUMN ni DROP CONSTRAINT.
    # On doit utiliser batch_alter_table pour les modifications de colonnes.

    # 1. Renommer la table borrowers -> contacts
    op.rename_table('borrowers', 'contacts')

    # 2. Renommer la colonne borrower_id -> contact_id dans loans
    # SQLite nécessite batch mode pour renommer des colonnes
    with op.batch_alter_table('loans', schema=None) as batch_op:
        batch_op.alter_column('borrower_id', new_column_name='contact_id')

    # 3. Ajouter contact_id à borrowed_books (nullable d'abord pour la migration de données)
    with op.batch_alter_table('borrowed_books', schema=None) as batch_op:
        batch_op.add_column(sa.Column('contact_id', sa.Integer(), nullable=True))

    # 4. Fusionner les contacts dupliqués (noms identiques après TRIM + LOWER)
    # et migrer les données borrowed_from -> contact_id
    conn = op.get_bind()

    # 4a. Fusionner les contacts dupliqués (même nom normalisé, même owner)
    # AVANT de trim, car la contrainte UNIQUE (name, owner_id) empêcherait le TRIM direct.
    # Pour chaque groupe de doublons, garder le plus ancien (plus petit ID)
    duplicates = conn.execute(
        sa.text(
            "SELECT LOWER(TRIM(name)) as norm_name, owner_id, MIN(id) as keep_id "
            "FROM contacts GROUP BY LOWER(TRIM(name)), owner_id HAVING COUNT(*) > 1"
        )
    ).fetchall()

    for norm_name, owner_id, keep_id in duplicates:
        # Réassigner les loans des doublons vers le contact conservé
        conn.execute(
            sa.text(
                "UPDATE loans SET contact_id = :keep_id "
                "WHERE contact_id IN ("
                "  SELECT id FROM contacts "
                "  WHERE LOWER(TRIM(name)) = :norm_name AND owner_id = :owner_id AND id != :keep_id"
                ")"
            ),
            {"keep_id": keep_id, "norm_name": norm_name, "owner_id": owner_id}
        )
        # Supprimer les doublons
        conn.execute(
            sa.text(
                "DELETE FROM contacts "
                "WHERE LOWER(TRIM(name)) = :norm_name AND owner_id = :owner_id AND id != :keep_id"
            ),
            {"norm_name": norm_name, "owner_id": owner_id, "keep_id": keep_id}
        )

    # 4b. Normaliser les noms des contacts restants (trim les espaces)
    # Maintenant qu'il n'y a plus de doublons, le TRIM ne violera pas la contrainte UNIQUE
    conn.execute(sa.text("UPDATE contacts SET name = TRIM(name)"))

    # 4c. Migrer borrowed_from -> contact_id
    # Récupérer toutes les combinaisons distinctes
    distinct_sources = conn.execute(
        sa.text("SELECT DISTINCT borrowed_from, user_id FROM borrowed_books")
    ).fetchall()

    for borrowed_from, user_id in distinct_sources:
        trimmed_name = borrowed_from.strip() if borrowed_from else borrowed_from

        # Chercher un contact existant (case-insensitive, trim)
        existing = conn.execute(
            sa.text(
                "SELECT id FROM contacts WHERE LOWER(TRIM(name)) = LOWER(:name) AND owner_id = :owner_id"
            ),
            {"name": trimmed_name, "owner_id": user_id}
        ).fetchone()

        if existing:
            contact_id = existing[0]
        else:
            # Créer un nouveau contact avec le nom nettoyé
            conn.execute(
                sa.text(
                    "INSERT INTO contacts (name, owner_id, created_at) VALUES (:name, :owner_id, datetime('now'))"
                ),
                {"name": trimmed_name, "owner_id": user_id}
            )
            contact_id = conn.execute(sa.text("SELECT last_insert_rowid()")).scalar()

        # Mettre à jour les borrowed_books
        conn.execute(
            sa.text(
                "UPDATE borrowed_books SET contact_id = :contact_id "
                "WHERE borrowed_from = :borrowed_from AND user_id = :user_id"
            ),
            {"contact_id": contact_id, "borrowed_from": borrowed_from, "user_id": user_id}
        )

    # 5. Créer un index sur contact_id
    with op.batch_alter_table('borrowed_books', schema=None) as batch_op:
        batch_op.create_index('ix_borrowed_books_contact_id', ['contact_id'])


def downgrade() -> None:
    # 1. Supprimer l'index et la colonne contact_id de borrowed_books
    with op.batch_alter_table('borrowed_books', schema=None) as batch_op:
        batch_op.drop_index('ix_borrowed_books_contact_id')
        batch_op.drop_column('contact_id')

    # 2. Renommer contact_id -> borrower_id dans loans
    with op.batch_alter_table('loans', schema=None) as batch_op:
        batch_op.alter_column('contact_id', new_column_name='borrower_id')

    # 3. Renommer la table contacts -> borrowers
    op.rename_table('contacts', 'borrowers')
