#!/bin/bash
# Script de démarrage avec migration automatique

echo "🚀 Démarrage du backend MaBibliotheque..."

# Créer le répertoire de couvertures si nécessaire
mkdir -p /app/data/covers

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente de PostgreSQL..."

# Extraire l'hôte de DATABASE_URL (format: postgresql://user:pass@host:port/db)
DB_HOST=$(echo $DATABASE_URL | sed -e 's|.*@\([^:]*\):.*|\1|')
DB_PORT=$(echo $DATABASE_URL | sed -e 's|.*:\([0-9]*\)/.*|\1|')

# Attendre que PostgreSQL accepte les connexions
until pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -q; do
    echo "PostgreSQL n'est pas encore prêt - attente..."
    sleep 2
done

echo "✅ PostgreSQL est prêt!"

# Vérifier si la table alembic_version existe en PostgreSQL
echo "🔍 Vérification de l'état d'Alembic..."
TABLE_EXISTS=$(PGPASSWORD=$(echo $DATABASE_URL | sed -e 's|.*://[^:]*:\([^@]*\)@.*|\1|') psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U $(echo $DATABASE_URL | sed -e 's|.*://\([^:]*\):.*|\1|') -d $(echo $DATABASE_URL | sed -e 's|.*/\([^?]*\).*|\1|') -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alembic_version');" 2>/dev/null)

if [ "$TABLE_EXISTS" != "t" ]; then
    echo "⚠️  Première utilisation d'Alembic détectée"
    echo "📝 Création des tables et marquage à head..."

    # Créer toutes les tables via SQLModel, puis marquer comme à jour
    python -c "from app.db import init_db; init_db()"

    if [ $? -ne 0 ]; then
        echo "❌ Erreur lors de la création des tables"
        exit 1
    fi

    # Marquer toutes les migrations comme appliquées
    alembic stamp head

    if [ $? -ne 0 ]; then
        echo "❌ Erreur lors de l'initialisation d'Alembic"
        exit 1
    fi

    echo "✅ Base initialisée et marquée à head"
else
    # Lancer les migrations Alembic normalement
    echo "📦 Application des migrations Alembic..."
    alembic upgrade head

    if [ $? -ne 0 ]; then
        echo "❌ Erreur lors de l'application des migrations"
        exit 1
    fi

    echo "✅ Migrations appliquées avec succès"
fi

# Démarrer l'application
echo "🌐 Démarrage de l'API FastAPI..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
