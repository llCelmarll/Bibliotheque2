#!/usr/bin/env python3
"""
Script pour gérer la whitelist des emails autorisés.
Les emails sont stockés dans le fichier .env via la variable ALLOWED_EMAILS

Usage:
    python manage_whitelist.py add user@example.com
    python manage_whitelist.py remove user@example.com
    python manage_whitelist.py list
"""

import sys
import os

# Ajouter le chemin parent pour les imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config.whitelist import get_allowed_emails, is_email_allowed

ENV_FILE = os.path.join(os.path.dirname(__file__), ".env")

def read_env():
    """Lire le fichier .env"""
    if not os.path.exists(ENV_FILE):
        return {}
    
    env_vars = {}
    with open(ENV_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
    return env_vars

def write_env(env_vars):
    """Écrire dans le fichier .env"""
    with open(ENV_FILE, 'w', encoding='utf-8') as f:
        for key, value in env_vars.items():
            f.write(f"{key}={value}\n")

def get_current_emails():
    """Récupérer la liste actuelle des emails"""
    env_vars = read_env()
    emails_str = env_vars.get('ALLOWED_EMAILS', '')
    if not emails_str:
        return []
    return [email.strip() for email in emails_str.split(',') if email.strip()]

def save_emails(emails):
    """Sauvegarder la liste d'emails dans .env"""
    env_vars = read_env()
    env_vars['ALLOWED_EMAILS'] = ','.join(emails)
    write_env(env_vars)

def add_email(email):
    """Ajouter un email à la whitelist"""
    emails = get_current_emails()
    
    if email.lower() in [e.lower() for e in emails]:
        print(f"✅ L'email {email} est déjà dans la whitelist")
        return
    
    emails.append(email)
    save_emails(emails)
    print(f"✅ Email {email} ajouté à la whitelist (.env)")

def remove_email(email):
    """Retirer un email de la whitelist"""
    emails = get_current_emails()
    
    # Trouver l'email (case insensitive)
    found = None
    for e in emails:
        if e.lower() == email.lower():
            found = e
            break
    
    if not found:
        print(f"⚠️  L'email {email} n'est pas dans la whitelist")
        return
    
    emails.remove(found)
    save_emails(emails)
    print(f"✅ Email {email} retiré de la whitelist (.env)")

def list_emails():
    """Lister tous les emails de la whitelist"""
    emails = get_current_emails()
    
    if not emails:
        print("\n⚠️  Aucun email dans la whitelist")
        print("Ajoutez des emails avec: python manage_whitelist.py add user@example.com\n")
        return
    
    print("\n📋 Emails autorisés dans la whitelist (.env):\n")
    for i, email in enumerate(emails, 1):
        print(f"  {i}. {email}")
    print(f"\nTotal: {len(emails)} email(s)\n")

def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python manage_whitelist.py add user@example.com")
        print("  python manage_whitelist.py remove user@example.com")
        print("  python manage_whitelist.py list")
        return
    
    command = sys.argv[1].lower()
    
    if command == "list":
        list_emails()
    elif command == "add":
        if len(sys.argv) < 3:
            print("❌ Erreur: email manquant")
            print("Usage: python manage_whitelist.py add user@example.com")
            return
        add_email(sys.argv[2])
    elif command == "remove":
        if len(sys.argv) < 3:
            print("❌ Erreur: email manquant")
            print("Usage: python manage_whitelist.py remove user@example.com")
            return
        remove_email(sys.argv[2])
    else:
        print(f"❌ Commande inconnue: {command}")
        print("Commandes disponibles: add, remove, list")

if __name__ == "__main__":
    main()
