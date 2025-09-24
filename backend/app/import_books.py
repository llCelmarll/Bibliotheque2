import csv
import datetime as dt
from sqlmodel import Session, create_engine, SQLModel
from models.Book import Book

# Configuration de la base de données
engine = create_engine("sqlite:///bibliotheque.db")

def init_db():
    SQLModel.metadata.create_all(engine)

def import_books_from_csv(file_path: str):
    with open (file_path, newline="\n", encoding="Windows-1252") as csvfile:
        reader = csv.reader(csvfile, delimiter=";", quotechar='"')
        next(reader)  # Skip header row
        with Session(engine) as session:
            for row in reader:
                if row[3] == "":
                    continue  # Skip rows without a barcode
                book = Book(
                    title = row[0].strip() or None,
                    authors = row[1].strip() or None,
                    genre = row[2].strip() or None,
                    isbn = row[3].strip() or None,
                    barcode = row[3].strip() or None,
                    publisher = row[4].strip() or None,
                    published_date = int(row[5]) if row[5].isdigit() else None,
                    page_count = int(row[6]) if row[6].isdigit() else None,
                    lended = False,
                    lended_to = None,
                    lended_date = None,
                    return_date = None,
                )
                session.add(book)
            session.commit()


if __name__ == "__main__":
    init_db()
    import_books_from_csv("J:/Bibliotheque 2/testLivrotheque2.csv")
    print("Importation terminée.")