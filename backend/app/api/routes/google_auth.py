import logging

from fastapi import APIRouter, Depends
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password, create_access_token, create_refresh_token
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth import TokenResponse
from app.schemas.common import ErrorResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


class GoogleAuthRequest(BaseModel):
    credential: str


@router.post("/google")
def google_auth(body: GoogleAuthRequest, db: Session = Depends(get_db)):
    if not settings.google_client_id:
        return ErrorResponse(message="Google authentication is not configured")

    try:
        idinfo = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            settings.google_client_id,
            clock_skew_in_seconds=60,
        )
    except ValueError as e:
        logger.warning("Google token verification failed: %s", e)
        return ErrorResponse(message="Invalid Google token")

    email = idinfo.get("email")
    if not email:
        return ErrorResponse(message="Google account has no email")

    repo = UserRepository(db)
    user = repo.get_by_email(email)

    if not user:
        user = User(
            email=email,
            password_hash=hash_password(__import__("secrets").token_urlsafe(32)),
        )
        user = repo.create(user)

    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))

    return {
        "success": True,
        "data": TokenResponse(access_token=access, refresh_token=refresh).model_dump(),
    }
