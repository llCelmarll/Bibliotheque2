from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routers import books
from app.db import init_db
from fastapi.middleware.cors import CORSMiddleware



# Initialiser la base de données
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Bibliothèque API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # en dev seulement
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(books.router)

# Route de test
@app.get("/")
async def read_root():
    return {"message": "Bienvenue à la Bibliothèque API!"}

# Route de santé
@app.get("/health")
async def health_check():
    return {"status": "ok"}