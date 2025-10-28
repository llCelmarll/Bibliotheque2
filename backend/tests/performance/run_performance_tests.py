#!/usr/bin/env python3
"""
Script de lancement des tests de performance.
Usage: python run_performance_tests.py [scenario]
"""
import sys
import os
import subprocess
from pathlib import Path

# Ajouter le répertoire backend au path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from tests.performance.config import SCENARIOS, LOCUST_CONFIG


def run_scenario(scenario_name: str, headless: bool = True):
    """Lancer un scénario de test spécifique."""
    if scenario_name not in SCENARIOS:
        print(f"❌ Scénario '{scenario_name}' inconnu.")
        print(f"📋 Scénarios disponibles: {', '.join(SCENARIOS.keys())}")
        return False
    
    scenario = SCENARIOS[scenario_name]
    file_path = f"tests/performance/{scenario['file']}"
    
    print(f"🚀 Lancement du scénario: {scenario['description']}")
    print(f"📁 Fichier: {file_path}")
    print(f"👥 Utilisateurs: {scenario['users']}")
    print(f"⚡ Spawn rate: {scenario['spawn_rate']}")
    print(f"⏱️  Durée: {scenario['run_time']}")
    print("-" * 50)
    
    # Construire la commande locust
    cmd = [
        "locust",
        "-f", file_path,
        "--host", LOCUST_CONFIG["host"],
        "--users", str(scenario["users"]),
        "--spawn-rate", str(scenario["spawn_rate"]),
        "--run-time", scenario["run_time"]
    ]
    
    if headless:
        cmd.append("--headless")
    
    # Exécuter la commande
    try:
        result = subprocess.run(cmd, cwd=str(backend_dir), check=True)
        print("✅ Test de performance terminé avec succès!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erreur lors de l'exécution: {e}")
        return False


def list_scenarios():
    """Lister tous les scénarios disponibles."""
    print("📋 Scénarios de performance disponibles:")
    print("-" * 50)
    
    for name, scenario in SCENARIOS.items():
        print(f"🎯 {name}")
        print(f"   📝 {scenario['description']}")
        print(f"   👥 {scenario['users']} utilisateurs")
        print(f"   ⏱️  {scenario['run_time']}")
        print()


def main():
    """Point d'entrée principal."""
    if len(sys.argv) < 2:
        print("📊 Tests de Performance - Bibliotheque API")
        print("=" * 50)
        list_scenarios()
        print("💡 Usage:")
        print("   python run_performance_tests.py <scenario>")
        print("   python run_performance_tests.py mixed_workflow")
        print("   python run_performance_tests.py --ui mixed_workflow  # Avec interface web")
        return
    
    # Vérifier si l'interface web est demandée
    headless = True
    scenario_name = sys.argv[1]
    
    if "--ui" in sys.argv:
        headless = False
        scenario_name = sys.argv[2] if len(sys.argv) > 2 else sys.argv[1]
    
    if scenario_name == "list":
        list_scenarios()
        return
    
    # Vérifier que le serveur est disponible
    print("🔍 Vérification de la disponibilité du serveur...")
    try:
        import requests
        response = requests.get(LOCUST_CONFIG["host"], timeout=5)
        print("✅ Serveur accessible")
    except Exception as e:
        print(f"❌ Serveur non accessible sur {LOCUST_CONFIG['host']}")
        print("💡 Assurez-vous que l'API est démarrée avec: uvicorn app.main:app --reload")
        return
    
    # Lancer le scénario
    success = run_scenario(scenario_name, headless)
    
    if not headless and success:
        print("🌐 Interface web disponible sur: http://localhost:8089")


if __name__ == "__main__":
    main()