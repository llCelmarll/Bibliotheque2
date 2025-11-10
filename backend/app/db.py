from sqlmodel import SQLModel
from app.models.Author import Author
from app.models.Book import Book
from app.models.Publisher import Publisher
from app.models.Genre import Genre
from app.models.BookAuthorLink import BookAuthorLink
from app.models.BookGenreLink import BookGenreLink
from sqlmodel import create_engine, Session
import os
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger("db_init")

# Utiliser le dossier /app/data pour la persistance via volume Docker
# En local, utilise le dossier backend/

# Utilisation de DATABASE_URL si défini
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    logger.info(f"[DB INIT] Utilisation de DATABASE_URL: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL, echo=False)
else:
    # Fallback legacy : DATA_DIR ou backend
    if os.getenv("DATA_DIR"):
        DATA_DIR = os.getenv("DATA_DIR")
    else:
        BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        DATA_DIR = BACKEND_DIR
    DB_PATH = os.path.join(DATA_DIR, "bibliotheque.db")
    logger.info(f"[DB INIT] Utilisation du chemin local: {DB_PATH}")
    os.makedirs(DATA_DIR, exist_ok=True)
    engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)


# Create the database and tables
def init_db():
    SQLModel.metadata.create_all(engine)

# Dependency to get DB session
def get_session():
    with Session(engine) as session:
        yield session
