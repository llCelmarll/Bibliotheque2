# test_scan.py - Script pour tester la route scan
import requests
import json

def test_scan_route():
    """Test de la route /scan avec un ISBN d'Albin Michel"""
    
    # ISBN d'un livre d'Albin Michel pour tester
    isbn = "9782226393158"
    
    try:
        print(f"🧪 Test de scan pour ISBN: {isbn}")
        
        # Appel à la route scan
        response = requests.post(f"http://192.168.1.18:8000/scan?isbn={isbn}")
        
        if response.status_code == 200:
            data = response.json()
            
            print("✅ Scan réussi!")
            print(f"📖 Livre en base: {'Oui' if data.get('base') else 'Non'}")
            
            if suggested := data.get('suggested'):
                print(f"📝 Titre suggéré: {suggested.get('title')}")
                print(f"👤 Auteurs suggérés: {suggested.get('authors')}")
                print(f"🏢 Éditeur suggéré: '{suggested.get('publisher')}'")
                print(f"📅 Date: {suggested.get('published_date')}")
                
                # Vérification spéciale pour Albin Michel
                publisher = suggested.get('publisher')
                if publisher == 'Albin Michel':
                    print("✅ Éditeur 'Albin Michel' correctement détecté depuis la base!")
                elif publisher and 'albin' in publisher.lower():
                    print(f"⚠️ Éditeur similaire détecté: '{publisher}' (pas exactement 'Albin Michel')")
                else:
                    print(f"❌ Éditeur non détecté ou différent: '{publisher}'")
            
            print(f"\n📊 Réponse complète:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
        else:
            print(f"❌ Erreur HTTP {response.status_code}: {response.text}")
    
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_scan_route()