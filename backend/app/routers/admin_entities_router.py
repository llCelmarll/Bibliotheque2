from fastapi import APIRouter, Depends, Path
from sqlmodel import Session
from app.db import get_session
from app.models.user_model import User
from app.schemas.admin_schemas import MergeEntitiesRequest
from app.services.admin_entity_service import AdminEntityService
from app.services.auth_service import get_current_moderator_user_sync as get_current_moderator_user

router = APIRouter(prefix="/admin/entities", tags=["admin"])


def get_admin_entity_service(
    session: Session = Depends(get_session),
) -> AdminEntityService:
    return AdminEntityService(session)


@router.post("/{entity_type}/merge")
def merge_entities(
    entity_type: str = Path(..., description="author | publisher | genre | series"),
    data: MergeEntitiesRequest = ...,
    current_user: User = Depends(get_current_moderator_user),
    service: AdminEntityService = Depends(get_admin_entity_service),
):
    return service.merge(entity_type, data, current_user.id)
