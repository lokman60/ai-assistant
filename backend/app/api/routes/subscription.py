from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.schemas.common import ErrorResponse
from app.services.subscription_service import SubscriptionService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["subscription"])


@router.get("/me/plan")
def get_plan(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    svc = SubscriptionService(db)
    user = svc.get_user(user_id)
    if not user:
        return ErrorResponse(message="User not found")
    return {"success": True, "message": "OK", "data": svc.get_plan_info(user)}


@router.post("/upgrade")
def upgrade_plan(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    svc = SubscriptionService(db)
    user = svc.get_user(user_id)
    if not user:
        return ErrorResponse(message="User not found")
    if user.plan == "pro":
        return {"success": True, "message": "Already Pro"}
    svc.upgrade(user)
    return {"success": True, "message": "Upgraded to Pro", "data": {"plan": "pro"}}


@router.post("/downgrade")
def downgrade_plan(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    svc = SubscriptionService(db)
    user = svc.get_user(user_id)
    if not user:
        return ErrorResponse(message="User not found")
    svc.downgrade(user)
    return {"success": True, "message": "Downgraded to Free", "data": {"plan": "free"}}
