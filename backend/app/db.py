from sqlmodel import SQLModel, create_engine, Session
from app.models import Book

engine = create_engine("sqlite:///./bibliotheque.db", echo=False)

# Create the database and tables
def init_db():
    SQLModel.metadata.create_all(engine)

# Dependency to get DB session
def get_session():
    with Session(engine) as session:
        yield session