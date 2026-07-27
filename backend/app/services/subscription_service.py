from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repo import UserRepository

logger = logging.getLogger(__name__)

FREE_LIMITS = {
    "max_documents_per_day": 5,
    "pdf_translation_pages": 1,
    "chat_pages": 200,
    "summarization_pages": 200,
    "search_pages": 200,
    "ocr_pages": 200,
}

PRO_LIMITS = {
    "max_documents_per_day": 99999,
    "pdf_translation_pages": 99999,
    "chat_pages": 99999,
    "summarization_pages": 99999,
    "search_pages": 99999,
    "ocr_pages": 99999,
}

PLAN_FEATURES = {
    "free": [
        "Chat with PDF",
        "AI Summarization",
        "PDF Translation (1 page/doc)",
        "Document Search",
        "5 documents per day",
        "Export translated PDF",
    ],
    "pro": [
        "Unlimited pages & documents",
        "Translate entire PDFs",
        "Unlimited AI Chat",
        "Unlimited Summarization",
        "OCR for scanned PDFs",
        "Priority processing",
        "Future premium AI features",
    ],
}


class SubscriptionService:
    def __init__(self, db: Session):
        self._repo = UserRepository(db)
        self._db = db

    def get_user(self, user_id: str) -> User | None:
        return self._repo.get_by_id(user_id)

    def _ensure_reset(self, user: User) -> None:
        now = datetime.now(timezone.utc)
        if user.reset_date is None or user.reset_date.date() < now.date():
            user.documents_today = 0
            user.reset_date = now

    def get_limits(self, user: User) -> dict:
        return PRO_LIMITS if user.plan == "pro" else FREE_LIMITS

    def get_features(self, plan: str) -> list[str]:
        return PLAN_FEATURES.get(plan, PLAN_FEATURES["free"])

    def get_plan_info(self, user: User) -> dict:
        self._ensure_reset(user)
        limits = self.get_limits(user)
        return {
            "plan": user.plan,
            "documents_today": user.documents_today,
            "max_documents_per_day": limits["max_documents_per_day"],
            "features": self.get_features(user.plan),
        }

    def check_document_upload_allowed(self, user: User) -> tuple[bool, str | None]:
        self._ensure_reset(user)
        limits = self.get_limits(user)
        if user.documents_today >= limits["max_documents_per_day"]:
            return False, f"Daily upload limit reached ({limits['max_documents_per_day']} documents). Upgrade to Pro for unlimited uploads."
        return True, None

    def increment_document_upload(self, user: User) -> None:
        self._ensure_reset(user)
        user.documents_today += 1
        self._db.commit()

    def check_page_limit(self, user: User, feature: str, page_count: int) -> tuple[bool, str | None]:
        limits = self.get_limits(user)
        key = f"{feature}_pages"
        limit = limits.get(key, 99999)

        if page_count > limit:
            feature_labels = {
                "pdf_translation": "PDF Translation",
                "chat": "AI Chat",
                "summarization": "AI Summarization",
                "search": "Document Search",
                "ocr": "OCR",
            }
            label = feature_labels.get(feature, feature)
            return False, f"{label} is limited to {limit} page{'s' if limit != 1 else ''} per document on the Free plan. Upgrade to Pro to process unlimited pages."
        return True, None

    def add_page_limit_error(self, feature: str, page_count: int) -> dict:
        limits = FREE_LIMITS
        key = f"{feature}_pages"
        limit = limits.get(key, 0)
        return {
            "error": "plan_limit",
            "message": f"This document has {page_count} pages. {feature.replace('_', ' ').title()} is limited to {limit} page{'s' if limit != 1 else ''} on the Free plan.",
            "data": {"feature": feature, "limit": limit, "pages": page_count},
        }

    def upgrade(self, user: User) -> None:
        user.plan = "pro"
        self._db.commit()

    def downgrade(self, user: User) -> None:
        user.plan = "free"
        self._db.commit()
