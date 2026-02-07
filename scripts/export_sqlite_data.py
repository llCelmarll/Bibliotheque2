#!/usr/bin/env python3
"""
Script d'export des données SQLite vers JSON.
Utilisation: python scripts/export_sqlite_data.py [chemin_sqlite] [chemin_sortie]
"""

import sqlite3
import json
import sys
import os
from datetime import datetime
from pathlib import Path


def get_tables(cursor):
    """Récupère la liste des tables (exclut alembic_version)."""
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name != 'alembic_version'
        ORDER BY name
    """)
    return [row[0] for row in cursor.fetchall()]


def export_table(cursor, table_name):
    """Exporte une table vers une liste de dictionnaires."""
    cursor.execute(f"SELECT * FROM {table_name}")
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()

    data = []
    for row in rows:
        record = {}
        for i, col in enumerate(columns):
            value = row[i]
            # Gérer les types spéciaux
            if isinstance(value, bytes):
                value = value.decode('utf-8', errors='replace')
            record[col] = value
        data.append(record)

    return data


def main():
    # Chemins par défaut
    default_sqlite = Path(__file__).parent.parent / "backups" / "bibliotheque_pre_postgresql.db"
    default_output = Path(__file__).parent.parent / "backups" / "data_export.json"

    sqlite_path = sys.argv[1] if len(sys.argv) > 1 else str(default_sqlite)
    output_path = sys.argv[2] if len(sys.argv) > 2 else str(default_output)

    if not os.path.exists(sqlite_path):
        print(f"Erreur: Base SQLite non trouvée: {sqlite_path}")
        sys.exit(1)

    print(f"=== Export SQLite vers JSON ===")
    print(f"Source: {sqlite_path}")
    print(f"Destination: {output_path}")
    print()

    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()

    tables = get_tables(cursor)
    print(f"Tables trouvées: {len(tables)}")
    print()

    export = {
        "metadata": {
            "exported_at": datetime.now().isoformat(),
            "source": sqlite_path,
            "tables": []
        },
        "data": {}
    }

    total_records = 0

    for table in tables:
        data = export_table(cursor, table)
        export["data"][table] = data
        export["metadata"]["tables"].append({
            "name": table,
            "count": len(data)
        })
        total_records += len(data)
        print(f"  {table}: {len(data)} enregistrements")

    conn.close()

    # Créer le dossier de sortie si nécessaire
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(export, f, indent=2, ensure_ascii=False, default=str)

    print()
    print(f"=== Export terminé ===")
    print(f"Total: {total_records} enregistrements")
    print(f"Fichier: {output_path}")
    print(f"Taille: {os.path.getsize(output_path) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
