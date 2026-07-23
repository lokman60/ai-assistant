from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    errors: list[str] = []


class SuccessResponse(BaseModel):
    success: bool = True
    message: str = "OK"
    data: Optional[dict] = None
