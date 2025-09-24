from sqlmodel import SQLModel, create_engine, Session
from app.models.Book import Book
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Genre import Genre
from app.models.BookAuthorLink import BookAuthorLink
from app.models.BookGenreLink import BookGenreLink


engine = create_engine("sqlite:///./bibliotheque.db", echo=False)

# Create the database and tables
def init_db():
    SQLModel.metadata.create_all(engine)

# Dependency to get DB session
def get_session():
    with Session(engine) as session:
        yield session