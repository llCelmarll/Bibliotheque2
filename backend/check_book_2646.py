#!/usr/bin/env python
"""Script pour diagnostiquer le livre 2646"""
import os
from pathlib import Path

# Charger le .env manuellement
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

from app.db import engine
from sqlmodel import text
from app.config import COVERS_DIR

print(f"\n🔍 Diagnostic du livre ID 2646\n")
print(f"COVERS_DIR: {COVERS_DIR}")
print(f"COVERS_DIR existe: {COVERS_DIR.exists()}\n")

# Vérifier en base de données
with engine.connect() as conn:
    result = conn.execute(text(
        "SELECT id, title, cover_url FROM books WHERE id = 2646"
    ))
    book = result.fetchone()
    
    if book:
        book_id, title, cover_url = book
        print(f"📚 Livre en base:")
        print(f"   ID: {book_id}")
        print(f"   Titre: {title}")
        print(f"   cover_url: {cover_url}")
        print()
        
        # Vérifier le fichier physique
        expected_file = COVERS_DIR / "2646.jpg"
        print(f"📂 Fichier attendu: {expected_file}")
        print(f"   Existe: {expected_file.exists()}")
        
        if expected_file.exists():
            file_size = expected_file.stat().st_size
            print(f"   Taille: {file_size / 1024:.1f} KB")
        
        # Chercher d'autres fichiers de couverture pour ce livre
        print(f"\n🔍 Recherche de tous les fichiers 2646.*:")
        for file in COVERS_DIR.glob("2646.*"):
            print(f"   - {file.name} ({file.stat().st_size / 1024:.1f} KB)")
        
        # Problème de chemin ?
        if cover_url and not cover_url.startswith('/covers/'):
            print(f"\n❌ PROBLÈME: Le chemin en base est incorrect!")
            print(f"   Actuel: {cover_url}")
            print(f"   Attendu: /covers/2646.jpg")
            print(f"\n🔧 Commande SQL pour corriger:")
            print(f"   UPDATE books SET cover_url = '/covers/2646.jpg' WHERE id = 2646;")
    else:
        print(f"❌ Livre 2646 introuvable en base!")

# Lister tous les fichiers dans COVERS_DIR
print(f"\n📁 Contenu de {COVERS_DIR}:")
files = list(COVERS_DIR.glob("*"))
print(f"   {len(files)} fichiers trouvés")
for f in sorted(files)[:10]:
    print(f"   - {f.name}")
if len(files) > 10:
    print(f"   ... et {len(files) - 10} autres")
