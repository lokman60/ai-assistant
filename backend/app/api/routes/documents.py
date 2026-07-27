import logging

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.schemas.common import ErrorResponse
from app.schemas.document import DocumentResponse, DocumentRename
from app.services.document_service import DocumentService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["documents"])


@router.post("/documents")
def upload_document(file: UploadFile = File(...), user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    svc = DocumentService(db)
    try:
        doc = svc.upload(user_id, file)
        return {"success": True, "message": "Document uploaded", "data": DocumentResponse.model_validate(doc).model_dump()}
    except ValueError as e:
        return ErrorResponse(message=str(e))
    except Exception as e:
        logger.exception("Upload failed unexpectedly")
        return ErrorResponse(message="Upload failed. Please try again.")


@router.get("/documents")
def list_documents(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    svc = DocumentService(db)
    docs = svc.list_documents(user_id)
    return {
        "success": True,
        "message": "OK",
        "data": {
            "documents": [DocumentResponse.model_validate(d).model_dump() for d in docs],
            "total": len(docs),
        },
    }


@router.delete("/documents/{document_id}")
def delete_document(document_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    svc = DocumentService(db)
    try:
        svc.delete_document(document_id, user_id)
        return {"success": True, "message": "Document deleted"}
    except ValueError as e:
        return ErrorResponse(message=str(e))


@router.patch("/documents/{document_id}")
def rename_document(document_id: str, body: DocumentRename, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    svc = DocumentService(db)
    try:
        doc = svc.rename_document(document_id, user_id, body.title)
        return {"success": True, "message": "Document renamed", "data": DocumentResponse.model_validate(doc).model_dump()}
    except ValueError as e:
        return ErrorResponse(message=str(e))
