from sqlmodel import SQLModel
from app.models.Author import Author
from app.models.Book import Book
from app.models.Publisher import Publisher
from app.models.Genre import Genre
from app.models.Series import Series
from app.models.Contact import Contact
from app.models.Loan import Loan
from app.models.BorrowedBook import BorrowedBook
from app.models.BookAuthorLink import BookAuthorLink
from app.models.BookGenreLink import BookGenreLink
from app.models.BookSeriesLink import BookSeriesLink
from sqlmodel import create_engine, Session
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger("db_init")

# Configuration de la base de données PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

logger.info(f"[DB INIT] Connexion à la base de données...")

# Configuration du pool de connexions pour PostgreSQL
engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)


# Create the database and tables
def init_db():
    SQLModel.metadata.create_all(engine)

# Dependency to get DB session
def get_session():
    with Session(engine) as session:
        yield session
