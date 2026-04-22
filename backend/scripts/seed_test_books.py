#!/usr/bin/env python3
"""
Seed de livres de test pour couvrir les edge cases de l'export CSV.
Usage: depuis le dossier backend/ — python scripts/seed_test_books.py [user_id]
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Charger .env du dossier backend
backend_dir = Path(__file__).parent.parent
load_dotenv(backend_dir / ".env")

sys.path.insert(0, str(backend_dir))

# Importer tous les modèles pour que SQLAlchemy résolve toutes les relations
from app.models.User import User  # noqa: F401
from app.models.Book import Book  # noqa: F401
from app.models.Author import Author  # noqa: F401
from app.models.Publisher import Publisher  # noqa: F401
from app.models.Genre import Genre  # noqa: F401
from app.models.Series import Series  # noqa: F401
from app.models.Contact import Contact  # noqa: F401
from app.models.ContactInvitation import ContactInvitation  # noqa: F401
from app.models.UserLoanRequest import UserLoanRequest  # noqa: F401
from app.models.Loan import Loan  # noqa: F401
from app.models.BorrowedBook import BorrowedBook  # noqa: F401
from app.models.UserPushToken import UserPushToken  # noqa: F401
from app.models.PasswordResetToken import PasswordResetToken  # noqa: F401

from sqlmodel import Session, create_engine
from app.services.book_service import BookService
from app.schemas.Book import BookCreate

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("DATABASE_URL non défini dans .env")

engine = create_engine(DATABASE_URL, echo=False)

USER_ID = int(sys.argv[1]) if len(sys.argv) > 1 else 1

BOOKS = [
    # 1. Livre complet — tous les champs remplis
    BookCreate(
        title="Le Seigneur des Anneaux : La Communauté de l'Anneau",
        subtitle="La Communauté de l'Anneau",
        isbn="9782070612888",
        authors=["J.R.R. Tolkien"],
        publisher="Gallimard",
        genres=["Fantasy", "Aventure"],
        published_date="1954",
        page_count=576,
        series=[{"name": "Le Seigneur des Anneaux", "volume_number": 1}],
        is_read=True,
        rating=5,
        notes="Chef-d'œuvre absolu. Relu plusieurs fois.",
        cover_url="https://covers.openlibrary.org/b/isbn/9782070612888-L.jpg",
    ),
    # 2. Livre sans auteur
    BookCreate(
        title="Anonyme — sans auteur",
        isbn="9780000000001",
        genres=["Philosophie"],
        published_date="2000",
        page_count=120,
        is_read=False,
    ),
    # 3. Livre sans genre
    BookCreate(
        title="Mémoires d'Hadrien",
        authors=["Marguerite Yourcenar"],
        publisher="Gallimard",
        published_date="1951",
        page_count=321,
        is_read=True,
        rating=4,
    ),
    # 4. Livre avec plusieurs auteurs
    BookCreate(
        title="Good Omens",
        authors=["Terry Pratchett", "Neil Gaiman"],
        publisher="Gollancz",
        genres=["Fantasy", "Humour"],
        published_date="1990",
        page_count=413,
        is_read=True,
        rating=5,
    ),
    # 5. Livre avec série sans numéro de tome
    BookCreate(
        title="Dune",
        isbn="9782266233200",
        authors=["Frank Herbert"],
        publisher="Pocket",
        genres=["Science-Fiction"],
        published_date="1965",
        page_count=896,
        series=[{"name": "Dune", "volume_number": None}],
        is_read=True,
        rating=5,
        notes="Lecture obligatoire.",
    ),
    # 6. Notes avec point-virgule et guillemets (test échappement CSV)
    BookCreate(
        title='Le "Grand" Livre ; test CSV',
        authors=["Auteur Test"],
        genres=["Test"],
        notes='Contient des ; point-virgules et des "guillemets" — doit être bien échappé dans le CSV.',
        is_read=False,
        rating=2,
    ),
    # 7. Livre sans statut de lecture (None)
    BookCreate(
        title="Guerre et Paix",
        authors=["Léon Tolstoï"],
        publisher="Gallimard",
        genres=["Roman", "Historique"],
        published_date="1869",
        page_count=1440,
    ),
    # 8. Livre avec couverture hébergée localement (simulée)
    BookCreate(
        title="Livre avec couverture locale",
        authors=["Auteur Local"],
        genres=["Test"],
        cover_url="/covers/999",
        is_read=False,
    ),
    # 9. Livre minimal — titre uniquement
    BookCreate(
        title="Titre seul — tous champs vides",
    ),
    # 10. Tome 2 d'une série déjà présente
    BookCreate(
        title="Les Deux Tours",
        subtitle="Le Seigneur des Anneaux — Tome 2",
        isbn="9782070612895",
        authors=["J.R.R. Tolkien"],
        publisher="Gallimard",
        genres=["Fantasy", "Aventure"],
        published_date="1954",
        page_count=441,
        series=[{"name": "Le Seigneur des Anneaux", "volume_number": 2}],
        is_read=True,
        rating=5,
        cover_url="https://covers.openlibrary.org/b/isbn/9782070612895-L.jpg",
    ),
]

def main():
    with Session(engine) as session:
        service = BookService(session=session, user_id=USER_ID)
        ok, skip = 0, 0
        for book_data in BOOKS:
            try:
                service.create_book(book_data)
                print(f"  OK   {book_data.title}")
                ok += 1
            except Exception as e:
                print(f"  SKIP {book_data.title} -- {e}")
                skip += 1
        print(f"\nTerminé : {ok} créés, {skip} ignorés (déjà existants ou erreur)")

if __name__ == "__main__":
    main()
