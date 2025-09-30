# Active l'environnement virtuel
& .\.venv\Scripts\Activate.ps1

# Lance le serveur backend avec uvicorn
uvicorn app.main:app --reload --port 8000 --host 192.168.1.18
