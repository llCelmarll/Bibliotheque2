from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.routers import books
from app.db import init_db



# Initialiser la base de données
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Bibliothèque API", version="0.1.0", lifespan=lifespan)

app.include_router(books.router)

# Route de test
@app.get("/")
async def read_root():
    return {"message": "Bienvenue à la Bibliothèque API!"}

# Route de santé
@app.get("/health")
async def health_check():
    return {"status": "ok"}