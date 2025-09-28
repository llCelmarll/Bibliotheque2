import asyncio
from sqlmodel import Session, select
from app.db import engine
from app.models.Book import Book
from app.clients.google_books import fetch_google_books
from app.clients.openlibrary import fetch_openlibrary

async def update_covers():
	with Session(engine) as session:
		books = session.exec(select(Book)).all()
		for book in books:
			print(f"Traitement du livre : {book.title}")
			if book.cover_url:
				print(f"Couverture déjà présente pour {book.title}, ignoré.")
				continue
			if not book.isbn:
				print(f"Pas d'isbn pour {book.title}, ignoré.")
				continue

            # Essai Google Books
			data = await fetch_google_books(book.isbn)
			if data:
				cover = data.get("imageLinks", {}).get("thumbnail")
				if cover:
					book.cover_url = cover
					print(f"[Google Books] Couverture trouvée : {book.title}")
				else:
					print(f"Pas de cover_url trouvé sur Google Books pour {book.title}")
					# print(data.get("imageLinks", {}))  # DEBUG
					# image = input("Quelle image utiliser ? (ou Entrée pour ignorer) ")
					# if image:
					# 	book.cover_url = data.get("imageLinks", {}).get(image)
					# 	print(f"[Google Books] Couverture choisie : {book.title}")
			else: 
				print(f"Pas de cover_url trouvé sur Google Books pour {book.title}")
				#Essai OpenLibrary
				data = await fetch_openlibrary(book.isbn)
				if data:
					book.cover_url = f"https://covers.openlibrary.org/b/isbn/{book.isbn}-M.jpg"
					print(f"[OpenLibrary] Couverture trouvée : {book.title}")
				else:
					print(f"Pas de couverture trouvée sur OpenLibrary pour {book.title}")

			session.add(book)
		session.commit()

if __name__ == "__main__":
    asyncio.run(update_covers())