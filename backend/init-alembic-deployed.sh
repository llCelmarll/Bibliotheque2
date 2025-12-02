#!/bin/bash
# Script pour initialiser Alembic sur une base existante
# À exécuter MANUELLEMENT la première fois sur le NAS

echo "🔧 Initialisation d'Alembic sur la base déployée..."

# Vérifier que la base existe
if [ ! -f ./data/bibliotheque.db ]; then
    echo "❌ Erreur: La base de données n'existe pas dans ./data/bibliotheque.db"
    exit 1
fi

# Vérifier si alembic_version existe déjà
TABLE_EXISTS=$(sqlite3 ./data/bibliotheque.db "SELECT name FROM sqlite_master WHERE type='table' AND name='alembic_version';" 2>/dev/null)

if [ -n "$TABLE_EXISTS" ]; then
    echo "⚠️  La table alembic_version existe déjà"
    CURRENT_VERSION=$(sqlite3 ./data/bibliotheque.db "SELECT version_num FROM alembic_version;" 2>/dev/null)
    echo "   Version actuelle: $CURRENT_VERSION"
else
    echo "📦 Création de la table alembic_version..."

    # Marquer la base comme étant à la version juste avant notre migration
    # C'est-à-dire la dernière migration avant celle qui ajoute owner_id
    alembic stamp 54edcc49b969

    if [ $? -eq 0 ]; then
        echo "✅ Base marquée à la version 54edcc49b969"
        echo "   Vous pouvez maintenant lancer: alembic upgrade head"
    else
        echo "❌ Erreur lors du marquage de la version"
        exit 1
    fi
fi

echo "✅ Initialisation terminée"
