# backend/populate_test_entities.py
"""Script pour peupler la base avec quelques entités de test"""
import sys
import os
from sqlmodel import Session, create_engine
from app.models.Author import Author
from app.models.Publisher import Publisher
from app.models.Genre import Genre
from app.db import get_db_url

def populate_authors(session: Session):
    authors = [
        "Victor Hugo",
        "J.K. Rowling", 
        "George Orwell",
        "Agatha Christie",
        "Jules Verne",
        "Stephen King",
        "Isaac Asimov",
        "J.R.R. Tolkien",
        "Marcel Proust",
        "Albert Camus"
    ]
    
    for author_name in authors:
        # Vérifier si existe déjà
        existing = session.query(Author).filter(Author.name == author_name).first()
        if not existing:
            author = Author(name=author_name)
            session.add(author)
            print(f"✓ Auteur créé: {author_name}")
        else:
            print(f"- Auteur existe déjà: {author_name}")

def populate_publishers(session: Session):
    publishers = [
        "Gallimard",
        "Le Livre de Poche", 
        "Flammarion",
        "Penguin Books",
        "Hachette",
        "Seuil",
        "Folio",
        "Pocket"
    ]
    
    for publisher_name in publishers:
        existing = session.query(Publisher).filter(Publisher.name == publisher_name).first()
        if not existing:
            publisher = Publisher(name=publisher_name)
            session.add(publisher)
            print(f"✓ Éditeur créé: {publisher_name}")
        else:
            print(f"- Éditeur existe déjà: {publisher_name}")

def populate_genres(session: Session):
    genres = [
        "Roman",
        "Science-Fiction",
        "Fantasy", 
        "Thriller",
        "Policier",
        "Biographie",
        "Histoire",
        "Essai",
        "Poésie",
        "Jeunesse",
        "Bande Dessinée",
        "Philosophie"
    ]
    
    for genre_name in genres:
        existing = session.query(Genre).filter(Genre.name == genre_name).first()
        if not existing:
            genre = Genre(name=genre_name)
            session.add(genre)
            print(f"✓ Genre créé: {genre_name}")
        else:
            print(f"- Genre existe déjà: {genre_name}")

def main():
    # Créer l'engine et la session
    engine = create_engine(get_db_url())
    session = Session(engine)
    
    try:
        print("🚀 Peuplement de la base avec des données de test...")
        
        populate_authors(session)
        populate_publishers(session)
        populate_genres(session)
        
        session.commit()
        print("✅ Peuplement terminé avec succès!")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Erreur lors du peuplement: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    main()