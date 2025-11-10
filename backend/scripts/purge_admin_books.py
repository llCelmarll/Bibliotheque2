#!/usr/bin/env python3
"""
Supprime tous les livres appartenant à l'utilisateur admin@example.com dans la base locale SQLite.
Usage:
  python backend/scripts/purge_admin_books.py
"""

import sqlite3

DB_PATH = "bibliotheque.db"
ADMIN_EMAIL = "admin@example.com"


def purge_admin_books():
	# Connexion
	conn = sqlite3.connect(DB_PATH)
	conn.execute("PRAGMA foreign_keys = ON;")
	cur = conn.cursor()

	# Trouver l'utilisateur admin
	cur.execute("SELECT id FROM users WHERE email = ?", (ADMIN_EMAIL,))
	row = cur.fetchone()
	if not row:
		print(f"⚠️ Utilisateur {ADMIN_EMAIL} introuvable. Rien à supprimer.")
		conn.close()
		return
	admin_id = row[0]

	# Récupérer les IDs des livres de l'admin
	cur.execute("SELECT id FROM books WHERE owner_id = ?", (admin_id,))
	book_ids = [r[0] for r in cur.fetchall()]
	if not book_ids:
		print("ℹ️ Aucun livre à supprimer pour cet utilisateur.")
		conn.close()
		return

	print(f"{len(book_ids)} livre(s) à supprimer pour {ADMIN_EMAIL}")

	# Supprimer les liens dans les tables d'association si elles existent
	# NB: Certaines tables peuvent ne pas exister selon les migrations en place.
	for link_table in ("book_author_link", "book_genre_link"):
		try:
			cur.execute(
				f"DELETE FROM {link_table} WHERE book_id IN ({','.join(['?']*len(book_ids))})",
				book_ids,
			)
		except Exception:
			# Ignorer si la table n'existe pas
			pass

	# Supprimer les livres
	cur.execute(f"DELETE FROM books WHERE id IN ({','.join(['?']*len(book_ids))})", book_ids)
	deleted = cur.rowcount

	conn.commit()
	conn.close()

	print(f"Suppression terminée. {deleted} livre(s) supprimé(s).")


if __name__ == "__main__":
	purge_admin_books()

