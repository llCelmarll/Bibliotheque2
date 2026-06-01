from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.db import get_session
from app.services.magazine_loan_service import MagazineLoanService
from app.services.auth_service import get_current_user
from app.models.User import User
from app.schemas.MagazineLoan import MagazineLoanRead, MagazineLoanCreate, MagazineLoanUpdate, MagazineLoanReturn

router = APIRouter(prefix="/magazine-loans", tags=["magazine-loans"])


def get_service(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> MagazineLoanService:
    return MagazineLoanService(session, user_id=current_user.id)


@router.get("", response_model=List[MagazineLoanRead])
def get_all(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: MagazineLoanService = Depends(get_service),
):
    return service.get_all(skip, limit)


@router.get("/active", response_model=List[MagazineLoanRead])
def get_active(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: MagazineLoanService = Depends(get_service),
):
    return service.get_active_loans(skip, limit)


@router.get("/overdue", response_model=List[MagazineLoanRead])
def get_overdue(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: MagazineLoanService = Depends(get_service),
):
    return service.get_overdue_loans(skip, limit)


@router.get("/statistics", response_model=Dict[str, Any])
def get_statistics(service: MagazineLoanService = Depends(get_service)):
    return service.get_statistics()


@router.get("/by-issue/{issue_id}", response_model=List[MagazineLoanRead])
def get_by_issue(
    issue_id: int,
    service: MagazineLoanService = Depends(get_service),
):
    return service.get_loans_by_issue(issue_id)


@router.get("/{loan_id}", response_model=MagazineLoanRead)
def get_by_id(
    loan_id: int,
    service: MagazineLoanService = Depends(get_service),
):
    return service.get_by_id(loan_id)


@router.post("", response_model=MagazineLoanRead, status_code=201)
def create(
    data: MagazineLoanCreate,
    service: MagazineLoanService = Depends(get_service),
):
    return service.create(data)


@router.put("/{loan_id}", response_model=MagazineLoanRead)
def update(
    loan_id: int,
    data: MagazineLoanUpdate,
    service: MagazineLoanService = Depends(get_service),
):
    return service.update(loan_id, data)


@router.post("/{loan_id}/return", response_model=MagazineLoanRead)
def return_loan(
    loan_id: int,
    return_data: MagazineLoanReturn = None,
    service: MagazineLoanService = Depends(get_service),
):
    return service.return_loan(loan_id, return_data)


@router.delete("/{loan_id}", status_code=204)
def delete(
    loan_id: int,
    service: MagazineLoanService = Depends(get_service),
):
    service.delete(loan_id)
