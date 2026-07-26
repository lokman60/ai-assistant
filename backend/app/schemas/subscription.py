from __future__ import annotations

from pydantic import BaseModel


class PlanInfo(BaseModel):
    plan: str
    documents_today: int
    max_documents: int
    max_pages: int
    features: list[str]
