import csv
from sqlmodel import Session, select
from app.db import init_db, engine
from app.models.Book import Book
from app.models.Author import Author
from app.models.Genre import Genre
from app.models.Publisher import Publisher
import datetime as dt

def get_or_create(session: Session, model, name: str):
    """
    Cherche un objet par nom, ou le crée s'il n'existe pas.
    """
    if not name:
        return None
    instance = session.exec(select(model).where(model.name == name)).first()
    if not instance:
        instance = model(name=name)
        session.add(instance)
        session.commit()
        session.refresh(instance)
    return instance

def import_books_from_csv(file_path: str):
    """
    Importe des livres depuis un fichier CSV.
    """
    with Session(engine) as session:
        with open(file_path, newline='', encoding='Windows-1252') as csvfile:
            reader = csv.DictReader(csvfile, delimiter=";")
            # Lecture des en-tête
            for row in reader:

                 # parse date
                published_date = None
                if row['date_publication']:
                    try:
                        day, month, year = (int(part) for part in row['date_publication'].split('/'))
                        published_date = dt.date(year, month, day)
                    except ValueError:
                        pass

                book = Book(
                    title=row['titre'],
                    isbn=row['isbn'] or None,
                    published_date=published_date,
                    page_count=int(row['nb_pages']) if row['nb_pages'].isdigit() else None,
                )

                # Gestion des relations
                author = get_or_create(session, Author, row['auteur'])
                genre = get_or_create(session, Genre, row['genre'])
                publisher = get_or_create(session, Publisher, row['editeur'])

                if author:
                    book.authors.append(author)
                if genre:
                    book.genres.append(genre)
                if publisher:
                    book.publisher = publisher

                session.add(book)
                session.commit()
                session.refresh(book)
                print(f"Importé: {book.title}")
    print("Importation terminée.")


if __name__ == "__main__":
    init_db()
    import_books_from_csv("testLivrotheque2.csv")
