#!/usr/bin/env python3
"""
Script d'import des données JSON vers PostgreSQL.
Utilisation: python scripts/import_postgres_data.py [chemin_json]

Prérequis: DATABASE_URL doit être défini avec l'URL PostgreSQL.
"""

import json
import os
import sys
from pathlib import Path

# Ajouter le backend au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session


# Ordre d'import pour respecter les clés étrangères
IMPORT_ORDER = [
    "users",
    "publishers",
    "authors",
    "genres",
    "series",
    "contacts",
    "books",
    "book_author_link",
    "book_genre_link",
    "book_series_link",
    "loans",
    "borrowed_books",
]


def get_columns_for_table(engine, table_name):
    """Récupère les noms de colonnes d'une table PostgreSQL."""
    with engine.connect() as conn:
        result = conn.execute(text(f"""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = :table_name
            ORDER BY ordinal_position
        """), {"table_name": table_name})
        return [row[0] for row in result.fetchall()]


def convert_sqlite_to_postgres_types(record):
    """Convertit les types SQLite vers PostgreSQL."""
    converted = {}
    for key, value in record.items():
        # Convertir les entiers 0/1 en booléens pour les colonnes booléennes
        if key in ('is_active', 'is_read') and isinstance(value, int):
            converted[key] = bool(value)
        else:
            converted[key] = value
    return converted


def import_table(engine, table_name, records):
    """Importe les enregistrements dans une table PostgreSQL."""
    if not records:
        return 0

    # Récupérer les colonnes existantes dans PostgreSQL
    pg_columns = set(get_columns_for_table(engine, table_name))

    # Filtrer les colonnes du JSON pour ne garder que celles qui existent
    record_columns = set(records[0].keys())
    valid_columns = list(record_columns & pg_columns)

    if not valid_columns:
        print(f"  Attention: Aucune colonne valide pour {table_name}")
        return 0

    columns_str = ", ".join(valid_columns)
    placeholders = ", ".join([f":{col}" for col in valid_columns])

    inserted = 0
    with Session(engine) as session:
        for record in records:
            # Convertir les types SQLite vers PostgreSQL
            record = convert_sqlite_to_postgres_types(record)
            # Filtrer le record pour ne garder que les colonnes valides
            filtered_record = {k: v for k, v in record.items() if k in valid_columns}

            try:
                session.execute(
                    text(f"INSERT INTO {table_name} ({columns_str}) VALUES ({placeholders})"),
                    filtered_record
                )
                inserted += 1
            except Exception as e:
                print(f"  Erreur insertion dans {table_name}: {e}")
                print(f"  Record: {filtered_record}")
                session.rollback()
                raise

        session.commit()

    return inserted


def reset_sequences(engine):
    """Réinitialise les séquences auto-increment pour toutes les tables."""
    tables_with_id = [
        "users", "books", "authors", "publishers", "genres",
        "series", "contacts", "loans", "borrowed_books"
    ]

    print("\n=== Réinitialisation des séquences ===")

    with engine.connect() as conn:
        for table in tables_with_id:
            try:
                # Vérifier si la table existe et a des données
                result = conn.execute(text(f"SELECT MAX(id) FROM {table}"))
                max_id = result.scalar()

                if max_id is not None:
                    seq_name = f"{table}_id_seq"
                    conn.execute(text(f"SELECT setval('{seq_name}', {max_id})"))
                    print(f"  {table}: séquence réinitialisée à {max_id}")
                else:
                    print(f"  {table}: table vide, séquence non modifiée")

            except Exception as e:
                print(f"  {table}: erreur - {e}")

        conn.commit()


def main():
    # Chemin par défaut
    default_json = Path(__file__).parent.parent / "backups" / "data_export.json"
    json_path = sys.argv[1] if len(sys.argv) > 1 else str(default_json)

    # Vérifier DATABASE_URL
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Erreur: DATABASE_URL non défini")
        print("Exemple: export DATABASE_URL=postgresql://user:pass@localhost:5432/bibliotheque")
        sys.exit(1)

    if not database_url.startswith("postgresql"):
        print(f"Erreur: DATABASE_URL doit être PostgreSQL, reçu: {database_url[:30]}...")
        sys.exit(1)

    if not os.path.exists(json_path):
        print(f"Erreur: Fichier JSON non trouvé: {json_path}")
        print("Exécutez d'abord: python scripts/export_sqlite_data.py")
        sys.exit(1)

    print(f"=== Import JSON vers PostgreSQL ===")
    print(f"Source: {json_path}")
    print(f"Destination: PostgreSQL")
    print()

    # Charger les données JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        export = json.load(f)

    data = export.get("data", {})
    print(f"Tables dans l'export: {len(data)}")
    print()

    # Créer le moteur PostgreSQL
    engine = create_engine(database_url)

    # Désactiver les contraintes de clé étrangère pendant l'import
    with engine.connect() as conn:
        conn.execute(text("SET session_replication_role = 'replica'"))
        conn.commit()
    print("Contraintes FK désactivées temporairement")

    # Importer dans l'ordre
    total_imported = 0

    for table in IMPORT_ORDER:
        if table in data:
            records = data[table]
            try:
                count = import_table(engine, table, records)
                total_imported += count
                status = "OK" if count == len(records) else f"PARTIEL ({count}/{len(records)})"
                print(f"  {table}: {count} enregistrements importés - {status}")
            except Exception as e:
                print(f"  {table}: ERREUR - {e}")
                sys.exit(1)
        else:
            print(f"  {table}: non présent dans l'export")

    # Importer les tables non listées dans IMPORT_ORDER
    for table in data:
        if table not in IMPORT_ORDER:
            records = data[table]
            try:
                count = import_table(engine, table, records)
                total_imported += count
                print(f"  {table}: {count} enregistrements importés (table additionnelle)")
            except Exception as e:
                print(f"  {table}: ERREUR - {e}")

    # Réactiver les contraintes de clé étrangère
    with engine.connect() as conn:
        conn.execute(text("SET session_replication_role = 'origin'"))
        conn.commit()
    print("\nContraintes FK réactivées")

    # Réinitialiser les séquences
    reset_sequences(engine)

    print()
    print(f"=== Import terminé ===")
    print(f"Total: {total_imported} enregistrements importés")


if __name__ == "__main__":
    main()
