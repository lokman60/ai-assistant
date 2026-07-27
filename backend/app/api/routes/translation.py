from __future__ import annotations

import logging
import os
from typing import Optional

import fitz
from fastapi import APIRouter, Depends, File, Form, Header, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id, get_optional_user_id
from app.core.config import settings
from app.core.database import get_db
from app.schemas.common import ErrorResponse
from app.services.subscription_service import SubscriptionService
from app.services.pdf_translation_service import PDFTranslationService, cleanup_old_jobs

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["translation"])

svc = PDFTranslationService()


@router.post("/translate-pdf")
def translate_pdf(
    file: UploadFile = File(...),
    target_language: str = Form(...),
    user_id: Optional[str] = Depends(get_optional_user_id),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        return ErrorResponse(message="Only PDF files are supported")

    if not user_id:
        return {
            "success": False,
            "error": "plan_limit",
            "message": "Sign up to translate PDFs — it's free!",
            "data": {"feature": "pdf_translation", "limit": 1, "pages": 0},
        }

    os.makedirs(settings.upload_dir, exist_ok=True)
    temp_path = os.path.join(settings.upload_dir, f"translate_{file.filename}")
    content = file.file.read()
    with open(temp_path, "wb") as f:
        f.write(content)

    doc = fitz.open(temp_path)
    page_count = len(doc)
    doc.close()

    sub_svc = SubscriptionService(db)
    user = sub_svc.get_user(user_id)
    if not user:
        return ErrorResponse(message="User not found")

    allowed, msg = sub_svc.check_page_limit(user, "pdf_translation", page_count)
    if not allowed:
        return {"success": False, "error": "plan_limit", "message": msg, "data": {"feature": "pdf_translation", "limit": 1, "pages": page_count}}

    try:
        job_id = svc.start(temp_path, target_language)
        return {
            "success": True,
            "message": "Translation started",
            "data": {"job_id": job_id},
        }
    except Exception as e:
        logger.exception("Failed to start translation")
        return ErrorResponse(message=str(e))


@router.get("/translate-pdf/status/{job_id}")
def translate_status(job_id: str):
    job = svc.get_status(job_id)
    if not job:
        return ErrorResponse(message="Job not found")
    return {"success": True, "message": "OK", "data": job}


@router.get("/translate-pdf/download/{job_id}")
def translate_download(job_id: str):
    job = svc.get_status(job_id)
    if not job:
        return ErrorResponse(message="Job not found")
    if job["status"] != "completed":
        return ErrorResponse(message="Translation not yet complete")
    if not job.get("output_path") or not os.path.exists(job["output_path"]):
        return ErrorResponse(message="Output file not found")
    return FileResponse(
        job["output_path"],
        media_type="application/pdf",
        filename="translated.pdf",
    )
