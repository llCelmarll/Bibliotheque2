# Dockerfile pour Frontend React Native/Expo Web
FROM node:18-alpine

# Installer les dépendances système
RUN apk add --no-cache git

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration des dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY . .

# Exposer le port pour le serveur de développement
EXPOSE 8081

# Variables d'environnement pour Expo
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
ENV REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0
ENV EXPO_PUBLIC_API_URL=http://backend:8000

# Commande de démarrage
CMD ["npm", "run", "web"]