from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.user import User
from app.repositories.user_repo import UserRepository

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: Session):
        self._repo = UserRepository(db)

    def register(self, email: str, password: str) -> User:
        existing = self._repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")
        user = User(email=email, password_hash=hash_password(password))
        return self._repo.create(user)

    def login(self, email: str, password: str) -> tuple[str, str, User]:
        user = self._repo.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")
        access = create_access_token(str(user.id))
        refresh = create_refresh_token(str(user.id))
        return access, refresh, user

    def refresh_token(self, refresh_token: str) -> tuple[str, str]:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")
        user_id = payload["sub"]
        access = create_access_token(user_id)
        refresh = create_refresh_token(user_id)
        return access, refresh

    def get_user_by_id(self, user_id: str) -> User | None:
        return self._repo.get_by_id(user_id)
