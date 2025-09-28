from sqlmodel import SQLModel
from app.models.Author import Author
from app.models.Book import Book
from app.models.Publisher import Publisher
from app.models.Genre import Genre
from app.models.BookAuthorLink import BookAuthorLink
from app.models.BookGenreLink import BookGenreLink
from sqlmodel import create_engine, Session
import os

# Obtenir le chemin absolu vers le dossier backend
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BACKEND_DIR, "bibliotheque.db")

engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)


# Create the database and tables
def init_db():
    SQLModel.metadata.create_all(engine)

# Dependency to get DB session
def get_session():
    with Session(engine) as session:
        yield session

__all__ = ["Author", "Book", "Publisher", "Genre", "BookAuthorLink", "BookGenreLink"]