from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.services.scan_service import ScanService, ScanResult
from app.services.auth_service import get_current_user
from app.models.User import User
from app.db import get_session

router = APIRouter(prefix="/scan", tags=["scan"])

def get_scan_service(
	session: Session = Depends(get_session),
	current_user: User = Depends(get_current_user)
) -> ScanService:
	"""Dependency injection pour le service de scan avec utilisateur authentifié"""
	return ScanService(session, user_id=current_user.id)

@router.post("", response_model=ScanResult)
async def scan(
		isbn: str,
		scan_service: ScanService = Depends(get_scan_service)
) -> ScanResult:
	"""
    Point de terminaison pour scanner un ISBN et récupérer les informations associées au livre.

    Cette route analyse un ISBN fourni et retourne un ensemble complet d'informations
    provenant de différentes sources (base de données locale, Google Books, OpenLibrary).

    Args:
        isbn (str): Le code ISBN à scanner et traiter.
        scan_service (ScanService): Service de scan injecté via la dépendance.

    Returns:
        ScanResult: Un objet contenant :
            - base (BookRead | None): Le livre s'il existe déjà dans la base de données
            - suggested (SuggestedBook | None): Une suggestion de création de livre basée sur les données récupérées
            - title_match (List[BookRead] | None): Liste des livres ayant un titre similaire dans la base
            - google_book (dict | None): Données brutes récupérées depuis l'API Google Books
            - openlibrary (dict | None): Données brutes récupérées depuis l'API OpenLibrary

    Raises:
        HTTPException: En cas d'ISBN invalide ou si une erreur survient lors de la récupération des données
    """
	result = await scan_service.scan_isbn(isbn)
	return result