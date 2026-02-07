# Dockerfile pour Backend Python FastAPI
FROM python:3.11-slim

# Définir le répertoire de travail
WORKDIR /app

# Installer les dépendances système nécessaires pour PostgreSQL et les libs crypto
RUN apt-get update && apt-get install -y \
    gcc \
    libssl-dev \
    libffi-dev \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copier et installer les dépendances Python (production uniquement)
COPY requirements-prod.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-prod.txt

# Copier le code source
COPY . .

# Créer le répertoire pour les données si nécessaire
RUN mkdir -p /app/data

# Rendre le script de démarrage exécutable
RUN chmod +x /app/start.sh

# Exposer le port
EXPOSE 8000

# Variables d'environnement
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
# DATABASE_URL sera fourni par docker-compose

# Commande de démarrage avec migrations automatiques
CMD ["/app/start.sh"]