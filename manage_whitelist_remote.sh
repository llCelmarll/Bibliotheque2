#!/bin/bash
# Script pour gérer la whitelist sur le serveur de production
# Usage:
#   ./manage_whitelist_remote.sh list
#   ./manage_whitelist_remote.sh add user@example.com
#   ./manage_whitelist_remote.sh remove user@example.com
#   ./manage_whitelist_remote.sh add user@example.com --restart
#   ./manage_whitelist_remote.sh restart

set -e

# Configuration
# Chercher le fichier .env à utiliser (priorité à .env.synology puis .env)
if [ -f ".env.synology" ]; then
    ENV_FILE=".env.synology"
elif [ -f ".env" ]; then
    ENV_FILE=".env"
else
    echo -e "\033[0;31m❌ Aucun fichier .env trouvé (.env ou .env.synology)\033[0m"
    exit 1
fi

CONTAINER_NAME="mabibliotheque-backend"
AUTO_RESTART=false

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher l'aide
show_help() {
    echo -e "${BLUE}📋 Gestion de la whitelist des emails${NC}"
    echo ""
    echo "Usage:"
    echo "  $0 list                              - Afficher les emails du conteneur en cours"
    echo "  $0 add <email> [--restart]          - Ajouter un email à la whitelist"
    echo "  $0 remove <email> [--restart]       - Retirer un email de la whitelist"
    echo "  $0 show                              - Afficher le fichier .env.synology"
    echo "  $0 restart                           - Redémarrer le conteneur mabibliotheque-backend"
    echo ""
    echo "Options:"
    echo "  --restart, -r    Redémarrer automatiquement le conteneur après modification"
    echo ""
    echo "Exemples:"
    echo "  $0 list"
    echo "  $0 add newuser@example.com"
    echo "  $0 add newuser@example.com --restart"
    echo "  $0 remove olduser@example.com -r"
    echo "  $0 restart"
}

# Fonction pour lire la liste des emails
get_emails() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ Fichier $ENV_FILE introuvable${NC}"
        exit 1
    fi

    # Extraire ALLOWED_EMAILS du fichier .env
    grep "^ALLOWED_EMAILS=" "$ENV_FILE" | cut -d= -f2 || echo ""
}

# Fonction pour sauvegarder les emails
save_emails() {
    local emails=$1

    # Vérifier que le fichier existe
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ Fichier $ENV_FILE introuvable${NC}"
        exit 1
    fi

    # Créer une backup
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"

    # Remplacer la ligne ALLOWED_EMAILS
    if grep -q "^ALLOWED_EMAILS=" "$ENV_FILE"; then
        # La ligne existe, la remplacer
        sed -i "s|^ALLOWED_EMAILS=.*|ALLOWED_EMAILS=$emails|" "$ENV_FILE"
    else
        # La ligne n'existe pas, l'ajouter
        echo "ALLOWED_EMAILS=$emails" >> "$ENV_FILE"
    fi
}

# Fonction pour lister les emails
list_emails() {
    local emails=$(get_emails)

    if [ -z "$emails" ]; then
        echo -e "${YELLOW}⚠️  Aucun email dans la whitelist${NC}"
        echo "Ajoutez des emails avec: $0 add user@example.com"
        return
    fi

    echo -e "${BLUE}📋 Emails autorisés dans la whitelist:${NC}"
    echo ""

    IFS=',' read -ra EMAIL_ARRAY <<< "$emails"
    local count=1
    for email in "${EMAIL_ARRAY[@]}"; do
        # Trim whitespace
        email=$(echo "$email" | xargs)
        echo -e "  ${count}. ${GREEN}${email}${NC}"
        ((count++))
    done

    echo ""
    echo -e "Total: ${GREEN}${#EMAIL_ARRAY[@]}${NC} email(s)"
}

# Fonction pour ajouter un email
add_email() {
    local new_email=$1

    if [ -z "$new_email" ]; then
        echo -e "${RED}❌ Email manquant${NC}"
        echo "Usage: $0 add user@example.com"
        exit 1
    fi

    # Validation basique de l'email
    if ! echo "$new_email" | grep -qE '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'; then
        echo -e "${RED}❌ Format d'email invalide: $new_email${NC}"
        exit 1
    fi

    local emails=$(get_emails)

    # Vérifier si l'email existe déjà (case insensitive)
    if echo "$emails" | tr ',' '\n' | grep -iq "^$new_email$"; then
        echo -e "${GREEN}✅ L'email $new_email est déjà dans la whitelist${NC}"
        return
    fi

    # Ajouter l'email
    if [ -z "$emails" ]; then
        emails="$new_email"
    else
        emails="$emails,$new_email"
    fi

    save_emails "$emails"
    echo -e "${GREEN}✅ Email $new_email ajouté à la whitelist${NC}"

    if [ "$AUTO_RESTART" = true ]; then
        echo ""
        restart_container
    else
        echo ""
        echo -e "${YELLOW}⚠️  N'oubliez pas de recréer le conteneur backend pour appliquer les changements:${NC}"
        echo "  $0 restart"
        echo "  ou: sudo docker-compose up -d --force-recreate backend"
        echo ""
        echo -e "${BLUE}💡 Astuce: Utilisez --restart pour redémarrer automatiquement${NC}"
        echo "  Exemple: $0 add $new_email --restart"
    fi
}

# Fonction pour retirer un email
remove_email() {
    local email_to_remove=$1

    if [ -z "$email_to_remove" ]; then
        echo -e "${RED}❌ Email manquant${NC}"
        echo "Usage: $0 remove user@example.com"
        exit 1
    fi

    local emails=$(get_emails)

    if [ -z "$emails" ]; then
        echo -e "${YELLOW}⚠️  La whitelist est vide${NC}"
        return
    fi

    # Vérifier si l'email existe (case insensitive)
    if ! echo "$emails" | tr ',' '\n' | grep -iq "^$email_to_remove$"; then
        echo -e "${YELLOW}⚠️  L'email $email_to_remove n'est pas dans la whitelist${NC}"
        return
    fi

    # Retirer l'email
    IFS=',' read -ra EMAIL_ARRAY <<< "$emails"
    local new_emails=""

    for email in "${EMAIL_ARRAY[@]}"; do
        email=$(echo "$email" | xargs)
        if [ "${email,,}" != "${email_to_remove,,}" ]; then
            if [ -z "$new_emails" ]; then
                new_emails="$email"
            else
                new_emails="$new_emails,$email"
            fi
        fi
    done

    save_emails "$new_emails"
    echo -e "${GREEN}✅ Email $email_to_remove retiré de la whitelist${NC}"

    if [ "$AUTO_RESTART" = true ]; then
        echo ""
        restart_container
    else
        echo ""
        echo -e "${YELLOW}⚠️  N'oubliez pas de recréer le conteneur backend pour appliquer les changements:${NC}"
        echo "  $0 restart"
        echo "  ou: sudo docker-compose up -d --force-recreate backend"
        echo ""
        echo -e "${BLUE}💡 Astuce: Utilisez --restart pour redémarrer automatiquement${NC}"
        echo "  Exemple: $0 remove $email_to_remove --restart"
    fi
}

# Fonction pour afficher le fichier .env
show_env() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}❌ Fichier $ENV_FILE introuvable${NC}"
        exit 1
    fi

    echo -e "${BLUE}📄 Contenu de $ENV_FILE:${NC}"
    echo ""
    cat "$ENV_FILE"
}

# Fonction pour lister les emails depuis le conteneur en cours d'exécution
list_container_emails() {
    # Déterminer si sudo est nécessaire
    DOCKER_CMD="docker"
    if ! docker ps &>/dev/null 2>&1; then
        DOCKER_CMD="sudo docker"
    fi

    # Vérifier si le conteneur existe et est en cours d'exécution
    if ! $DOCKER_CMD ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${RED}❌ Le conteneur '$CONTAINER_NAME' n'est pas en cours d'exécution${NC}"
        echo -e "${YELLOW}Démarrez-le avec: $0 restart${NC}"
        return 1
    fi

    echo -e "${BLUE}📋 Emails autorisés dans le conteneur en cours d'exécution:${NC}"
    echo ""

    # Récupérer la variable ALLOWED_EMAILS du conteneur
    local container_emails=$($DOCKER_CMD exec $CONTAINER_NAME env | grep "^ALLOWED_EMAILS=" | cut -d= -f2)

    if [ -z "$container_emails" ]; then
        echo -e "${YELLOW}⚠️  Aucune variable ALLOWED_EMAILS trouvée dans le conteneur${NC}"
        echo -e "${YELLOW}Le conteneur utilise peut-être une configuration par défaut${NC}"
        return 1
    fi

    # Afficher les emails
    IFS=',' read -ra EMAIL_ARRAY <<< "$container_emails"
    local count=1
    for email in "${EMAIL_ARRAY[@]}"; do
        email=$(echo "$email" | xargs)
        echo -e "  ${count}. ${GREEN}${email}${NC}"
        ((count++))
    done

    echo ""
    echo -e "Total: ${GREEN}${#EMAIL_ARRAY[@]}${NC} email(s) dans le conteneur"
    echo ""

    # Comparer avec le fichier .env
    local file_emails=$(get_emails)
    if [ "$container_emails" != "$file_emails" ]; then
        echo -e "${YELLOW}⚠️  ATTENTION: Les emails du conteneur diffèrent du fichier .env${NC}"
        echo -e "${YELLOW}Fichier .env: ${file_emails}${NC}"
        echo -e "${YELLOW}Conteneur:    ${container_emails}${NC}"
        echo ""
        echo -e "${BLUE}💡 Utilisez '$0 restart' pour recharger le fichier .env dans le conteneur${NC}"
    else
        echo -e "${GREEN}✅ Le conteneur et le fichier .env sont synchronisés${NC}"
    fi
}

# Fonction pour recréer le conteneur (recharge les variables d'environnement)
restart_container() {
    echo -e "${BLUE}🔄 Recréation du conteneur backend pour recharger le .env...${NC}"

    # Vérifier si Docker est disponible
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker n'est pas installé ou pas dans le PATH${NC}"
        echo -e "${YELLOW}Commande manuelle: sudo docker restart $CONTAINER_NAME${NC}"
        return 1
    fi

    # Déterminer si sudo est nécessaire
    DOCKER_CMD="docker"
    if ! docker ps &>/dev/null 2>&1; then
        # Docker nécessite sudo
        DOCKER_CMD="sudo docker"
        echo -e "${YELLOW}ℹ️  Utilisation de sudo pour Docker${NC}"
    fi

    # Déterminer si sudo est nécessaire pour docker-compose
    COMPOSE_CMD="docker-compose"
    if ! docker-compose ps &>/dev/null 2>&1; then
        COMPOSE_CMD="sudo docker-compose"
    fi

    # Vérifier si docker-compose est disponible
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ docker-compose n'est pas installé${NC}"
        echo -e "${YELLOW}Commande manuelle: sudo docker-compose up -d --force-recreate backend${NC}"
        return 1
    fi

    # Arrêter le conteneur backend
    echo -e "${YELLOW}ℹ️  Arrêt du conteneur backend...${NC}"
    $COMPOSE_CMD stop backend 2>/dev/null || true

    # Forcer la suppression du conteneur par son nom avec Docker directement
    echo -e "${YELLOW}ℹ️  Suppression forcée du conteneur backend...${NC}"
    $DOCKER_CMD rm -f $CONTAINER_NAME 2>/dev/null || true

    # Recréer le conteneur backend pour recharger le .env
    echo -e "${YELLOW}ℹ️  Recréation du conteneur pour recharger les variables d'environnement du fichier .env...${NC}"
    echo -e "${BLUE}Exécution: $COMPOSE_CMD up -d backend${NC}"

    $COMPOSE_CMD up -d backend

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Conteneur backend recréé avec succès${NC}"
    else
        echo -e "${RED}❌ Erreur lors de la recréation du conteneur${NC}"
        echo -e "${YELLOW}Vérifiez les logs: $COMPOSE_CMD logs backend${NC}"
        return 1
    fi

    echo ""
    echo -e "${BLUE}Attente de 5 secondes pour que le conteneur démarre...${NC}"
    sleep 5

    # Vérifier l'état du conteneur
    if $DOCKER_CMD ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${GREEN}✅ Le conteneur est actif${NC}"
        echo ""
        echo -e "${BLUE}📋 Vérification des variables d'environnement rechargées:${NC}"
        $DOCKER_CMD exec $CONTAINER_NAME env | grep ALLOWED_EMAILS || echo -e "${YELLOW}⚠️  Variable ALLOWED_EMAILS non trouvée${NC}"
    else
        echo -e "${YELLOW}⚠️  Le conteneur ne semble pas actif, vérifiez les logs:${NC}"
        echo -e "${YELLOW}   $COMPOSE_CMD logs backend${NC}"
    fi
}

# Programme principal
# Traiter les arguments
command="${1:-}"
email_arg="$2"

# Vérifier le flag --restart
if [ "$3" = "--restart" ] || [ "$3" = "-r" ] || [ "$2" = "--restart" ] || [ "$2" = "-r" ]; then
    AUTO_RESTART=true
fi

case "$command" in
    list)
        list_container_emails
        ;;
    add)
        if [ -z "$email_arg" ] || [ "$email_arg" = "--restart" ] || [ "$email_arg" = "-r" ]; then
            echo -e "${RED}❌ Email manquant${NC}"
            echo "Usage: $0 add user@example.com [--restart]"
            exit 1
        fi
        add_email "$email_arg"
        ;;
    remove)
        if [ -z "$email_arg" ] || [ "$email_arg" = "--restart" ] || [ "$email_arg" = "-r" ]; then
            echo -e "${RED}❌ Email manquant${NC}"
            echo "Usage: $0 remove user@example.com [--restart]"
            exit 1
        fi
        remove_email "$email_arg"
        ;;
    restart)
        restart_container
        ;;
    show)
        show_env
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Commande inconnue: $command${NC}"
        show_help
        exit 1
        ;;
esac
