#!/usr/bin/env python3
from app.database import get_session
from app.repositories.publisher_repository import PublisherRepository

def main():
    with get_session() as session:
        repo = PublisherRepository(session)
        publishers = repo.get_all()
        print('=== TOUS LES ÉDITEURS EN BASE ===')
        for p in publishers:
            print(f'ID: {p.id}, Nom: "{p.name}"')
        print(f'TOTAL: {len(publishers)} éditeurs')
        
        # Tester une recherche spécifique
        test_name = input("\nEntrez le nom de l'éditeur à tester (ou Enter pour passer): ")
        if test_name.strip():
            found = repo.get_by_name(test_name.strip())
            if found:
                print(f"✅ TROUVÉ: ID={found.id}, Nom='{found.name}'")
            else:
                print(f"❌ PAS TROUVÉ pour '{test_name}'")

if __name__ == "__main__":
    main()