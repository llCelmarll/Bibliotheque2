from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.routers import books, authors, publishers, genres, series, scan, auth, contacts, loans, borrowed_books, covers, user_loan_requests, users, contact_invitations
from app.db import init_db
from app.config import COVERS_DIR
from fastapi.middleware.cors import CORSMiddleware
import logging
from time import perf_counter

# Initialiser la base de données
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="Bibliothèque API", 
    version="0.1.0", 
    lifespan=lifespan,
    openapi_version="3.1.0"
)

# Logging de base (provisoire)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")

# Middleware de log des requêtes (début/fin)
@app.middleware("http")
async def log_requests(request, call_next):
	start = perf_counter()
	logger.info("HTTP %s %s?%s", request.method, request.url.path, request.url.query)
	response = await call_next(request)
	duration_ms = int((perf_counter() - start) * 1000)
	logger.info("HTTP %s %s -> %d (%d ms)", request.method, request.url.path, response.status_code, duration_ms)
	return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # en dev seulement
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)