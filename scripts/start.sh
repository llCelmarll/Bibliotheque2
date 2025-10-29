#!/bin/bash
# Script de démarrage pour l'application Bibliothèque

echo "🚀 Démarrage de l'application Bibliothèque..."

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Créer les répertoires nécessaires
echo "📁 Création des répertoires..."
mkdir -p docker/nginx/ssl

# Build et démarrage des services
echo "🔨 Construction et démarrage des services Docker..."
docker-compose up --build -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier le statut des services
echo "🔍 Vérification du statut des services..."
docker-compose ps

# Afficher les URLs d'accès
echo ""
echo "✅ Application démarrée avec succès!"
echo ""
echo "📱 Frontend (App): http://localhost:8081"
echo "🔧 Backend (API): http://localhost:8000"
echo "📚 Documentation API: http://localhost:8000/docs"
echo "🌐 Via Nginx: http://localhost"
echo ""
echo "Pour arrêter l'application: docker-compose down"
echo "Pour voir les logs: docker-compose logs -f"