from __future__ import annotations

import logging

from fastapi import APIRouter, UploadFile, File, Form

from app.schemas.common import ErrorResponse
from app.services.home_service import upload_file, ask_question

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/home", tags=["home"])


@router.post("/upload")
def upload(file: UploadFile = File(...)):
    try:
        result = upload_file(file)
        return {"success": True, "message": "Document processed", "data": result}
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except Exception as e:
        logger.exception("Home upload error")
        return ErrorResponse(message=str(e))


@router.post("/chat")
def chat(session_id: str = Form(...), question: str = Form(...), action: str = Form("qna")):
    try:
        result = ask_question(session_id, question, action)
        return {"success": True, "message": "OK", "data": result}
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except Exception as e:
        logger.exception("Home chat error")
        return ErrorResponse(message=str(e))
