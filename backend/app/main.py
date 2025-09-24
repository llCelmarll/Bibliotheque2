from fastapi import FastAPI
from app.routers import books
from app.db import init_db

app = FastAPI(title="Bibliothèque API", version="0.1.0")

# Initialiser la base de données
@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(books.router)

# Route de test
@app.get("/")
async def read_root():
    return {"message": "Bienvenue à la Bibliothèque API!"}

# Route de santé
@app.get("/health")
async def health_check():
    return {"status": "ok"}