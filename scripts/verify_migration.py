#!/usr/bin/env python3
"""
Script de vérification de la migration SQLite vers PostgreSQL.
Compare les comptages entre les deux bases de données.

Utilisation: python scripts/verify_migration.py [chemin_sqlite]

Prérequis: DATABASE_URL doit être défini avec l'URL PostgreSQL.
"""

import sqlite3
import os
import sys
from pathlib import Path

# Ajouter le backend au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlalchemy import create_engine, text


# Tables à vérifier
TABLES = [
    "users",
    "books",
    "authors",
    "publishers",
    "genres",
    "series",
    "contacts",
    "loans",
    "borrowed_books",
    "book_author_link",
    "book_genre_link",
    "book_series_link",
]


def count_sqlite(cursor, table):
    """Compte les enregistrements dans une table SQLite."""
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        return cursor.fetchone()[0]
    except Exception:
        return None


def count_postgres(engine, table):
    """Compte les enregistrements dans une table PostgreSQL."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            return result.scalar()
    except Exception:
        return None


def spot_check(sqlite_cursor, pg_engine, table, id_column="id"):
    """Vérifie quelques enregistrements aléatoires."""
    try:
        # Récupérer 3 IDs aléatoires de SQLite
        sqlite_cursor.execute(f"SELECT {id_column} FROM {table} ORDER BY RANDOM() LIMIT 3")
        sample_ids = [row[0] for row in sqlite_cursor.fetchall()]

        if not sample_ids:
            return True, "Table vide"

        # Vérifier qu'ils existent dans PostgreSQL
        with pg_engine.connect() as conn:
            for id_val in sample_ids:
                result = conn.execute(
                    text(f"SELECT COUNT(*) FROM {table} WHERE {id_column} = :id"),
                    {"id": id_val}
                )
                if result.scalar() == 0:
                    return False, f"ID {id_val} manquant dans PostgreSQL"

        return True, f"Spot check OK ({len(sample_ids)} IDs vérifiés)"

    except Exception as e:
        return False, str(e)


def main():
    # Chemins
    default_sqlite = Path(__file__).parent.parent / "backups" / "bibliotheque_pre_postgresql.db"
    sqlite_path = sys.argv[1] if len(sys.argv) > 1 else str(default_sqlite)

    # Vérifier DATABASE_URL
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Erreur: DATABASE_URL non défini")
        sys.exit(1)

    if not os.path.exists(sqlite_path):
        print(f"Erreur: Base SQLite non trouvée: {sqlite_path}")
        sys.exit(1)

    print("=" * 60)
    print("=== Vérification de la migration SQLite -> PostgreSQL ===")
    print("=" * 60)
    print()

    # Connexions
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_cursor = sqlite_conn.cursor()
    pg_engine = create_engine(database_url)

    all_ok = True
    total_sqlite = 0
    total_postgres = 0

    print(f"{'Table':<25} {'SQLite':>10} {'PostgreSQL':>12} {'Status':>10}")
    print("-" * 60)

    for table in TABLES:
        sqlite_count = count_sqlite(sqlite_cursor, table)
        pg_count = count_postgres(pg_engine, table)

        if sqlite_count is None:
            status = "N/A SQLite"
            symbol = "-"
        elif pg_count is None:
            status = "N/A PG"
            symbol = "-"
            all_ok = False
        elif sqlite_count == pg_count:
            status = "OK"
            symbol = "OK"
            total_sqlite += sqlite_count
            total_postgres += pg_count
        else:
            status = "DIFF"
            symbol = "DIFF"
            all_ok = False
            total_sqlite += sqlite_count
            total_postgres += pg_count

        sqlite_str = str(sqlite_count) if sqlite_count is not None else "N/A"
        pg_str = str(pg_count) if pg_count is not None else "N/A"

        print(f"{table:<25} {sqlite_str:>10} {pg_str:>12} {symbol:>10}")

    print("-" * 60)
    print(f"{'TOTAL':<25} {total_sqlite:>10} {total_postgres:>12}")
    print()

    # Spot checks
    print("=== Spot Checks ===")
    for table in ["users", "books", "authors", "contacts"]:
        # Déterminer la colonne ID
        if table in ["book_author_link", "book_genre_link", "book_series_link"]:
            id_col = "book_id"
        else:
            id_col = "id"

        ok, message = spot_check(sqlite_cursor, pg_engine, table, id_col)
        status = "OK" if ok else "ERREUR"
        print(f"  {table}: {status} - {message}")
        if not ok:
            all_ok = False

    sqlite_conn.close()

    print()
    print("=" * 60)
    if all_ok:
        print("=== VERIFICATION REUSSIE ===")
        print("Toutes les tables sont synchronisées.")
    else:
        print("=== ATTENTION: DIFFERENCES DETECTEES ===")
        print("Vérifiez les tables marquées DIFF ou ERREUR.")
    print("=" * 60)

    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
