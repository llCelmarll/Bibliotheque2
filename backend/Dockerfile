# Dockerfile pour Backend Python FastAPI
FROM python:3.11-slim

# Définir le répertoire de travail
WORKDIR /app

# Installer les dépendances système nécessaires pour SQLite et les libs crypto
RUN apt-get update && apt-get install -y \
    gcc \
    libssl-dev \
    libffi-dev \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copier et installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copier le code source
COPY . .

# Créer le répertoire pour la base de données si nécessaire
RUN mkdir -p /app/data

# Exposer le port
EXPOSE 8000

# Variables d'environnement
ENV PYTHONPATH=/app
ENV DATABASE_URL=sqlite:///./data/bibliotheque.db
ENV PYTHONUNBUFFERED=1

# Commande de démarrage
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]