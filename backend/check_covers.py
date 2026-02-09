#!/usr/bin/env python
"""Script pour vérifier et corriger les chemins de couverture"""
from app.db import engine
from sqlmodel import text

with engine.connect() as conn:
    # Vérifier tous les chemins de couverture
    result = conn.execute(text(
        "SELECT id, title, cover_url FROM books WHERE cover_url IS NOT NULL AND cover_url != ''"
    ))
    books = result.fetchall()
    
    print(f"\n📚 {len(books)} livres avec couverture\n")
    
    incorrect = []
    correct = []
    
    for book_id, title, cover_url in books:
        if cover_url.startswith('/covers/'):
            correct.append((book_id, title[:40], cover_url))
        else:
            incorrect.append((book_id, title[:40], cover_url))
    
    if correct:
        print(f"✅ {len(correct)} chemins corrects (/covers/...):")
        for bid, title, url in correct[:5]:
            print(f"  {bid}: {title}... -> {url}")
        if len(correct) > 5:
            print(f"  ... et {len(correct) - 5} autres")
    
    if incorrect:
        print(f"\n❌ {len(incorrect)} chemins INCORRECTS:")
        for bid, title, url in incorrect:
            print(f"  {bid}: {title}... -> {url}")
        
        # Proposer la correction
        print(f"\n🔧 Correction proposée:")
        print(f"   UPDATE books SET cover_url = '/covers/' || id || '.jpg'")
        print(f"   WHERE cover_url NOT LIKE '/covers/%';")
