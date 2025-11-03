# Option 1: Dockerfile avec base pré-remplie
FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    gcc \
    libssl-dev \
    libffi-dev \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copier le code source
COPY . .

# Créer le répertoire pour la base de données
RUN mkdir -p /app/data

# NOUVEAU: Copier une base de données pré-remplie (optionnel)
# COPY bibliotheque.db /app/data/bibliotheque.db

# NOUVEAU: Ou créer/migrer la base au build (optionnel)
# RUN python -c "from app.db import create_tables; create_tables()"

EXPOSE 8000

ENV PYTHONPATH=/app
ENV DATABASE_URL=sqlite:///./data/bibliotheque.db
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]