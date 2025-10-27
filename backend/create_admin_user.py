#!/usr/bin/env python3
"""
Script pour créer un utilisateur admin avec un mot de passe hashé.
Usage: python create_admin_user.py
"""

import sqlite3
import hashlib
from datetime import datetime

# Simple hash pour éviter les problèmes avec bcrypt
def hash_password(password: str) -> str:
    """Hash simple pour le développement (à remplacer par bcrypt en production)"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_test_user():
    # Connexion à la base de données
    conn = sqlite3.connect('bibliotheque.db')
    cursor = conn.cursor()
    
    # Données de l'utilisateur test
    email = "test@example.com"
    username = "testuser"
    password = "test123"  # Mot de passe simple pour les tests
    
    # Hasher le mot de passe
    hashed_password = hash_password(password)
    
    # Supprimer l'utilisateur existant s'il existe
    cursor.execute("DELETE FROM users WHERE email = ?", (email,))
    
    # Créer le nouvel utilisateur
    cursor.execute("""
        INSERT INTO users (email, username, hashed_password, is_active, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (email, username, hashed_password, True, datetime.utcnow()))
    
    # Obtenir l'ID du nouvel utilisateur
    user_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    
    print(f"✅ Utilisateur test créé avec succès!")
    print(f"📧 Email: {email}")
    print(f"🔐 Mot de passe: {password}")
    print(f"👤 ID utilisateur: {user_id}")
    print(f"🔐 Hash: {hashed_password[:20]}...")

def create_admin_user():
    # Connexion à la base de données
    conn = sqlite3.connect('bibliotheque.db')
    cursor = conn.cursor()
    
    # Données de l'utilisateur admin
    email = "admin@example.com"
    username = "admin"
    password = "admin123"  # Mot de passe simple pour les tests
    
    # Hasher le mot de passe
    hashed_password = hash_password(password)
    
    # Supprimer l'utilisateur existant s'il existe
    cursor.execute("DELETE FROM users WHERE email = ?", (email,))
    
    # Créer le nouvel utilisateur
    cursor.execute("""
        INSERT INTO users (email, username, hashed_password, is_active, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (email, username, hashed_password, True, datetime.utcnow()))
    
    # Obtenir l'ID du nouvel utilisateur
    user_id = cursor.lastrowid
    
    # Assigner tous les livres à cet utilisateur
    cursor.execute("UPDATE books SET owner_id = ? WHERE owner_id IS NULL OR owner_id = 1", (user_id,))
    
    conn.commit()
    conn.close()
    
    print(f"✅ Utilisateur admin créé avec succès!")
    print(f"📧 Email: {email}")
    print(f"🔐 Mot de passe: {password}")
    print(f"👤 ID utilisateur: {user_id}")
    print(f"🔐 Hash: {hashed_password[:20]}...")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        create_test_user()
    else:
        create_admin_user()