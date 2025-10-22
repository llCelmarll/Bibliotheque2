from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.services.scan_service import ScanService, ScanResult
from app.db import get_session

router = APIRouter(prefix="/scan", tags=["scan"])

def get_scan_service(session: Session = Depends(get_session)) -> ScanService:
	return ScanService(session)

@router.post("", response_model=ScanResult)
async def scan(
		isbn: str,
		scan_service: ScanService = Depends(get_scan_service)
):
	return await scan_service.scan_isbn(isbn)