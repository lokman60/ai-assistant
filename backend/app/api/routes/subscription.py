from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.models.user import User
from app.schemas.common import ErrorResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["subscription"])

FREE_LIMITS = {"max_documents": 5, "max_pages": 20}
PRO_LIMITS = {"max_documents": 9999, "max_pages": 99999}

PLAN_FEATURES = {
    "free": [
        "Chat with PDF",
        "AI Summaries",
        "Basic PDF Translation",
        "5 documents per day",
        "20 pages per document",
        "Limited chat history",
    ],
    "pro": [
        "Unlimited documents & pages",
        "Preserve original PDF layout in translation",
        "Batch translation",
        "Faster processing",
        "Unlimited AI chat",
        "Export to PDF & Word",
        "OCR for scanned PDFs",
        "Priority processing",
        "Future premium AI features",
    ],
}


@router.get("/me/plan")
def get_plan(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return ErrorResponse(message="User not found")

    limits = PRO_LIMITS if user.plan == "pro" else FREE_LIMITS
    features = PLAN_FEATURES.get(user.plan, PLAN_FEATURES["free"])

    return {
        "success": True,
        "message": "OK",
        "data": {
            "plan": user.plan,
            "documents_today": user.documents_today,
            "max_documents": limits["max_documents"],
            "max_pages": limits["max_pages"],
            "features": features,
        },
    }


@router.post("/upgrade")
def upgrade_plan(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return ErrorResponse(message="User not found")
    if user.plan == "pro":
        return {"success": True, "message": "Already Pro"}

    user.plan = "pro"
    db.commit()
    return {
        "success": True,
        "message": "Upgraded to Pro",
        "data": {"plan": "pro"},
    }


@router.post("/downgrade")
def downgrade_plan(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return ErrorResponse(message="User not found")

    user.plan = "free"
    db.commit()
    return {
        "success": True,
        "message": "Downgraded to Free",
        "data": {"plan": "free"},
    }
