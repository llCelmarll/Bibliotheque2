#!/bin/bash
# Script bash pour lancer les tests frontend et backend
# Usage: ./run_tests.sh [--backend] [--frontend] [--all] [--verbose]

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Fonctions d'affichage
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Variables
BACKEND=false
FRONTEND=false
ALL=false
VERBOSE=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --backend) BACKEND=true ;;
        --frontend) FRONTEND=true ;;
        --all) ALL=true ;;
        --verbose) VERBOSE=true ;;
        --help)
            cat <<EOF

🧪 Script de tests - Bibliothèque2

Usage:
  ./run_tests.sh --all           Lancer tous les tests (frontend + backend)
  ./run_tests.sh --backend       Lancer les tests backend uniquement
  ./run_tests.sh --frontend      Lancer les tests frontend uniquement
  ./run_tests.sh --verbose       Mode verbeux avec plus de détails

Exemples:
  ./run_tests.sh --all --verbose  # Tous les tests avec détails
  ./run_tests.sh --backend        # Tests backend uniquement

EOF
            exit 0
            ;;
        *)
            echo "Argument inconnu: $arg"
            echo "Utilisez --help pour voir les options"
            exit 1
            ;;
    esac
done

# Si aucun argument, afficher l'aide
if [[ "$BACKEND" == false && "$FRONTEND" == false && "$ALL" == false ]]; then
    $0 --help
    exit 0
fi

# Définir les répertoires
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

info "📂 Répertoire racine: $ROOT_DIR"
echo ""

# ====================================
# TESTS BACKEND
# ====================================
if [[ "$BACKEND" == true || "$ALL" == true ]]; then
    echo -e "${MAGENTA}═══════════════════════════════════════${NC}"
    echo -e "${MAGENTA}   TESTS BACKEND (Python/pytest)      ${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════${NC}"
    echo ""

    if [[ ! -d "$BACKEND_DIR" ]]; then
        error "Le répertoire backend n'existe pas: $BACKEND_DIR"
    fi

    cd "$BACKEND_DIR"

    # Activer l'environnement virtuel s'il existe
    if [[ -d ".venv" ]]; then
        info "Activation de l'environnement virtuel..."
        source .venv/bin/activate
        success "Environnement virtuel activé"
    fi

    # Vérifier pytest
    info "Vérification de pytest..."
    if ! command -v pytest &> /dev/null; then
        error "pytest n'est pas installé. Installez-le avec: pip install pytest pytest-asyncio pytest-cov"
    fi

    PYTEST_VERSION=$(pytest --version)
    success "pytest trouvé: $PYTEST_VERSION"

    echo ""
    info "Lancement des tests backend..."
    echo ""

    # Options pytest
    PYTEST_ARGS="tests/ -v"

    # Ajouter la couverture si pytest-cov est installe
    if python -c "import pytest_cov" &> /dev/null; then
        PYTEST_ARGS="$PYTEST_ARGS --cov=app --cov-report=term-missing --cov-report=html"
        info "Couverture de code activée"
    else
        warning "pytest-cov non installé, tests sans couverture"
    fi

    if [[ "$VERBOSE" == true ]]; then
        PYTEST_ARGS="$PYTEST_ARGS --tb=short -s"
    fi

    info "Commande: pytest $PYTEST_ARGS"
    echo ""

    if pytest $PYTEST_ARGS; then
        echo ""
        success "Tests backend réussis! ✨"
        info "Rapport de couverture généré dans: backend/htmlcov/index.html"
    else
        echo ""
        error "Tests backend échoués! Consultez les logs ci-dessus."
    fi

    echo ""
fi

# ====================================
# TESTS FRONTEND
# ====================================
if [[ "$FRONTEND" == true || "$ALL" == true ]]; then
    echo -e "${MAGENTA}═══════════════════════════════════════${NC}"
    echo -e "${MAGENTA}   TESTS FRONTEND (Jest/React Testing) ${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════${NC}"
    echo ""

    if [[ ! -d "$FRONTEND_DIR" ]]; then
        error "Le répertoire frontend n'existe pas: $FRONTEND_DIR"
    fi

    cd "$FRONTEND_DIR"

    # Vérifier npm
    info "Vérification de npm..."
    if ! command -v npm &> /dev/null; then
        error "npm n'est pas installé"
    fi

    NPM_VERSION=$(npm --version)
    success "npm trouvé: v$NPM_VERSION"

    # Vérifier node_modules
    if [[ ! -d "node_modules" ]]; then
        warning "node_modules non trouvé. Installation des dépendances..."
        npm install
    fi

    echo ""
    info "Lancement des tests frontend..."
    echo ""

    # Options Jest
    if [[ "$VERBOSE" == true ]]; then
        npm test -- --verbose --coverage
    else
        npm test -- --coverage
    fi

    if [[ $? -eq 0 ]]; then
        echo ""
        success "Tests frontend réussis! ✨"
        info "Rapport de couverture généré dans: frontend/coverage/"
    else
        echo ""
        error "Tests frontend échoués! Consultez les logs ci-dessus."
    fi

    echo ""
fi

# ====================================
# RÉSUMÉ
# ====================================
echo -e "${MAGENTA}═══════════════════════════════════════${NC}"
echo -e "${MAGENTA}             RÉSUMÉ DES TESTS          ${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════${NC}"
echo ""

if [[ "$BACKEND" == true || "$ALL" == true ]]; then
    success "Backend: Tous les tests sont passés"
    info "  - Tests unitaires"
    info "  - Tests d'intégration"
    info "  - Détection de livres similaires"
fi

if [[ "$FRONTEND" == true || "$ALL" == true ]]; then
    success "Frontend: Tous les tests sont passés"
    info "  - Composants React"
    info "  - Hooks personnalisés"
    info "  - Services API"
fi

echo ""
success "🎉 Tous les tests sont passés avec succès!"
echo ""
