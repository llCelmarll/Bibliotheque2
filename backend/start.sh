#!/bin/bash
# Script de dÃ©marrage avec migration automatique

echo "ðŸš€ DÃ©marrage du backend MaBibliotheque..."

# VÃ©rifier si la table alembic_version existe
echo "ðŸ” VÃ©rification de l'Ã©tat d'Alembic..."
TABLE_EXISTS=$(sqlite3 ./data/bibliotheque.db "SELECT name FROM sqlite_master WHERE type='table' AND name='alembic_version';" 2>/dev/null)

if [ -z "$TABLE_EXISTS" ]; then
    echo "âš ï¸  PremiÃ¨re utilisation d'Alembic dÃ©tectÃ©e"
    echo "ðŸ“ Marquage de la base Ã  la version initiale..."

    # Marquer la base comme Ã©tant Ã  la version juste avant la migration owner_id
    alembic stamp 54edcc49b969

    if [ $? -ne 0 ]; then
        echo "âŒ Erreur lors de l'initialisation d'Alembic"
        exit 1
    fi

    echo "âœ… Base marquÃ©e Ã  la version 54edcc49b969"
fi

# Lancer les migrations Alembic
echo "ðŸ“¦ Application des migrations Alembic..."
alembic upgrade head

if [ $? -ne 0 ]; then
    echo "âŒ Erreur lors de l'application des migrations"
    exit 1
fi

echo "âœ… Migrations appliquÃ©es avec succÃ¨s"

# DÃ©marrer l'application
echo "ðŸŒ DÃ©marrage de l'API FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
