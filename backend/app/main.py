from contextlib import asynccontextmanager
import os
import json
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from app.routers import books, authors, publishers, genres, series, scan, auth, contacts, loans, borrowed_books, covers, user_loan_requests, users, contact_invitations, account, push_tokens, notifications
from app.routers.import_jobs import router as import_jobs_router
from app.routers import reports, admin, admin_entities, contact_staff, waitlist

_sqladmin_enabled = os.getenv("SQLADMIN_ENABLED", "false").lower() == "true"
if _sqladmin_enabled:
    from app.admin.setup import setup_admin
from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command
from app.db import init_db
from app.services.reminder_scheduler import start_scheduler
from app.config import COVERS_DIR
from fastapi.middleware.cors import CORSMiddleware
import logging
from time import perf_counter

# Initialiser la base de données
@asynccontextmanager
async def lifespan(app: FastAPI):
    alembic_cfg = AlembicConfig("alembic.ini")
    alembic_command.upgrade(alembic_cfg, "head")
    init_db()
    start_scheduler()
    yield


tags_metadata = [
    {"name": "authentication", "description": "Inscription, connexion, tokens"},
    {"name": "users", "description": "Profils utilisateurs"},
    {"name": "books", "description": "Gestion des livres"},
    {"name": "covers", "description": "Couvertures des livres"},
    {"name": "scan", "description": "Scan ISBN"},
    {"name": "authors", "description": "Auteurs"},
    {"name": "publishers", "description": "Éditeurs"},
    {"name": "genres", "description": "Genres"},
    {"name": "series", "description": "Séries"},
    {"name": "loans", "description": "Prêts entre utilisateurs"},
    {"name": "user-loans", "description": "Demandes de prêt"},
    {"name": "borrowed-books", "description": "Livres empruntés"},
    {"name": "contacts", "description": "Contacts"},
    {"name": "contact-invitations", "description": "Invitations de contact"},
    {"name": "borrowers", "description": "Emprunteurs"},
    {"name": "account", "description": "Gestion du compte (mot de passe, profil, suppression)"},
    {"name": "push-notifications", "description": "Tokens push Expo"},
    {"name": "reports", "description": "Signalements de contenus"},
    {"name": "admin", "description": "Administration et modération"},
    {"name": "contact", "description": "Contact du staff"},
    {"name": "waitlist", "description": "Liste d'attente (inscription publique + gestion admin)"},
]

_is_production = os.getenv("ENV", os.getenv("ENVIRONMENT", "development")) == "production"

app = FastAPI(
    title="Bibliothèque API",
    version="0.1.0",
    lifespan=lifespan,
    openapi_version="3.1.0",
    openapi_tags=tags_metadata,
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
)

if _sqladmin_enabled:
    setup_admin(app)

# Logging de base (provisoire)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")

# Headers de sécurité HTTP
@app.middleware("http")
async def security_headers(request: Request, call_next):
	response = await call_next(request)
	response.headers["X-Frame-Options"] = "DENY"
	response.headers["X-Content-Type-Options"] = "nosniff"
	response.headers["X-XSS-Protection"] = "1; mode=block"
	response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
	response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
	if _is_production or request.url.path not in ("/docs", "/redoc", "/openapi.json"):
		response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
	if _is_production:
		response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
	return response

# Middleware de log des requêtes (début/fin)
@app.middleware("http")
async def log_requests(request, call_next):
	start = perf_counter()
	logger.info("HTTP %s %s?%s", request.method, request.url.path, request.url.query)
	response = await call_next(request)
	duration_ms = int((perf_counter() - start) * 1000)
	logger.info("HTTP %s %s -> %d (%d ms)", request.method, request.url.path, response.status_code, duration_ms)
	return response

env = os.getenv("ENV", os.getenv("ENVIRONMENT", "development"))
if env == "development":
    allowed_origins = ["*"]
else:
    origins_str = os.getenv("ALLOWED_ORIGINS", "https://mabibliotheque.ovh")
    allowed_origins = [o.strip() for o in origins_str.split(",")]

if _sqladmin_enabled:
    from starlette.middleware.sessions import SessionMiddleware
    app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY", "change-me"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(books.router)
app.include_router(authors.router)
app.include_router(publishers.router)
app.include_router(genres.router)
app.include_router(series.router)
app.include_router(scan.router)
app.include_router(auth.router)
app.include_router(contacts.router)
app.include_router(loans.router)
app.include_router(borrowed_books.router)
app.include_router(covers.router)
app.include_router(user_loan_requests.router)
app.include_router(users.router)
app.include_router(contact_invitations.router)
app.include_router(account.router)
app.include_router(push_tokens.router)
app.include_router(notifications.router)
app.include_router(import_jobs_router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(admin_entities.router)
app.include_router(contact_staff.router)
app.include_router(waitlist.router)

# Servir les images de couverture
app.mount("/covers", StaticFiles(directory=str(COVERS_DIR)), name="covers")

# Route de test
@app.get("/")
async def read_root():
    return {"message": "Bienvenue à la Bibliothèque API!"}

# Route de santé
@app.get("/health")
async def health_check():
    min_app_version = os.environ.get("MIN_APP_VERSION", "1.0.0")
    return {"status": "ok", "min_app_version": min_app_version}

# Route changelog
@app.get("/changelog")
async def get_changelog():
    candidates = [
        Path(__file__).parent.parent.parent / "docs" / "CHANGELOG.json",
        Path("/app/docs/CHANGELOG.json"),
    ]
    for path in candidates:
        if path.exists():
            with open(path, encoding="utf-8") as f:
                return json.load(f)
    return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)