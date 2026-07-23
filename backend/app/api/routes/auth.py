import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserResponse
from app.schemas.common import ErrorResponse
from app.services.auth_service import AuthService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    svc = AuthService(db)
    try:
        svc.register(body.email, body.password)
        return {"success": True, "message": "User registered successfully"}
    except ValueError as e:
        return ErrorResponse(message=str(e))


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    svc = AuthService(db)
    try:
        access, refresh, user = svc.login(body.email, body.password)
        return {"success": True, "message": "Login successful", "data": TokenResponse(access_token=access, refresh_token=refresh).model_dump()}
    except ValueError as e:
        return ErrorResponse(message=str(e))


@router.post("/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    svc = AuthService(db)
    try:
        access, refresh = svc.refresh_token(body.refresh_token)
        return {"success": True, "message": "Token refreshed", "data": TokenResponse(access_token=access, refresh_token=refresh).model_dump()}
    except ValueError as e:
        return ErrorResponse(message=str(e))


@router.get("/me")
def get_me(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    svc = AuthService(db)
    user = svc.get_user_by_id(user_id)
    if not user:
        return ErrorResponse(message="User not found")
    return {"success": True, "message": "OK", "data": UserResponse(id=str(user.id), email=user.email, created_at=str(user.created_at)).model_dump()}
