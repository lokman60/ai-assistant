from __future__ import annotations

from pydantic import BaseModel


class TranslationStartResponse(BaseModel):
    success: bool
    message: str
    data: dict | None = None


class JobStatusResponse(BaseModel):
    success: bool
    message: str
    data: dict | None = None
