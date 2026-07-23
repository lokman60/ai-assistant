from datetime import datetime

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    filename: str
    title: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentRename(BaseModel):
    title: str


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
    storage_used_mb: float
