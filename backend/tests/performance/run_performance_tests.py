"""
Script de lancement des tests de performance Locust.

Usage (depuis backend/):
    python tests/performance/run_performance_tests.py [scenario] [options]
    python tests/performance/run_performance_tests.py book_crud
    python tests/performance/run_performance_tests.py mixed_workflow --users 20 --time 3m
    python tests/performance/run_performance_tests.py --list
    python tests/performance/run_performance_tests.py --ui book_crud   # avec interface web
"""
import sys
import os
import subprocess
import argparse
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent.parent
LOCUSTFILE = "tests/performance/locustfile.py"
DEFAULT_HOST = "http://localhost:8000"

SCENARIOS = {
    "auth": {
        "description": "Charge sur l'authentification (login / register)",
        "users": 5,
        "spawn_rate": 1,
        "run_time": "1m",
    },
    "book_crud": {
        "description": "CRUD livres (liste, creation, detail, mise a jour, recherche)",
        "users": 10,
        "spawn_rate": 2,
        "run_time": "2m",
    },
    "mixed_workflow": {
        "description": "Workflow mixte realiste (auth + livres + scan)",
        "users": 15,
        "spawn_rate": 3,
        "run_time": "3m",
    },
}


def check_server(host: str) -> bool:
    try:
        import urllib.request
        urllib.request.urlopen(f"{host}/health", timeout=5)
        return True
    except Exception:
        return False


def run_scenario(scenario_name: str, users: int, spawn_rate: int, run_time: str,
                 host: str, headless: bool, csv_prefix: str) -> bool:
    locustfile = BACKEND_DIR / LOCUSTFILE

    cmd = [
        sys.executable, "-m", "locust",
        "-f", str(locustfile),
        "--host", host,
        "--users", str(users),
        "--spawn-rate", str(spawn_rate),
        "--run-time", run_time,
        "--csv", csv_prefix,
    ]
    if headless:
        cmd.append("--headless")

    print(f"Scenario  : {scenario_name}")
    print(f"Users     : {users}  |  Spawn rate: {spawn_rate}/s  |  Duration: {run_time}")
    print(f"Host      : {host}")
    print(f"CSV       : {csv_prefix}_stats.csv")
    print("-" * 60)

    try:
        result = subprocess.run(cmd, cwd=str(BACKEND_DIR))
        return result.returncode == 0
    except FileNotFoundError:
        print("ERROR: locust introuvable. Installez-le avec: pip install -r requirements-dev.txt")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Tests de performance Locust - Ma Bibliotheque API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="\n".join([
            "Scenarios disponibles:",
            *[f"  {name:20s} {s['description']}" for name, s in SCENARIOS.items()],
        ])
    )
    parser.add_argument("scenario", nargs="?", help="Scenario a lancer")
    parser.add_argument("--list", action="store_true", help="Lister les scenarios")
    parser.add_argument("--ui", action="store_true", help="Lancer avec l'interface web Locust")
    parser.add_argument("--host", default=DEFAULT_HOST, help=f"URL du serveur (defaut: {DEFAULT_HOST})")
    parser.add_argument("--users", type=int, help="Nombre d'utilisateurs (surcharge le scenario)")
    parser.add_argument("--time", dest="run_time", help="Duree du test, ex: 2m ou 90s (surcharge le scenario)")

    args = parser.parse_args()

    if args.list or not args.scenario:
        print("Scenarios disponibles:")
        print("-" * 60)
        for name, s in SCENARIOS.items():
            print(f"  {name:20s} {s['description']}")
            print(f"  {'':20s} {s['users']} users, {s['spawn_rate']}/s, {s['run_time']}")
        print()
        print("Usage: python tests/performance/run_performance_tests.py <scenario>")
        return

    if args.scenario not in SCENARIOS:
        print(f"Scenario inconnu: '{args.scenario}'")
        print(f"Scenarios valides: {', '.join(SCENARIOS)}")
        sys.exit(1)

    scenario = SCENARIOS[args.scenario]
    users = args.users or scenario["users"]
    run_time = args.run_time or scenario["run_time"]
    spawn_rate = max(1, users // 5)

    print()
    print("=" * 60)
    print("  Tests de performance - Ma Bibliotheque API")
    print("=" * 60)

    print(f"Verification du serveur sur {args.host}...")
    if not check_server(args.host):
        print(f"ERREUR: serveur inaccessible sur {args.host}")
        print("Demarrez le backend avec: python -m uvicorn app.main:app --port 8000")
        sys.exit(1)
    print("Serveur OK")
    print()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_dir = Path(__file__).parent / "results"
    csv_dir.mkdir(exist_ok=True)
    csv_prefix = str(csv_dir / f"{args.scenario}_{timestamp}")

    success = run_scenario(
        scenario_name=args.scenario,
        users=users,
        spawn_rate=spawn_rate,
        run_time=run_time,
        host=args.host,
        headless=not args.ui,
        csv_prefix=csv_prefix,
    )

    print()
    if success:
        print(f"Termine. Resultats dans: tests/performance/results/{args.scenario}_{timestamp}_stats.csv")
    else:
        print("Le test s'est termine avec des erreurs.")
        sys.exit(1)


if __name__ == "__main__":
    main()
