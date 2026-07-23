from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.document import Document
from app.repositories.base import BaseRepository


class DocumentRepository(BaseRepository[Document]):
    def __init__(self, db: Session):
        super().__init__(db, Document)

    def get_user_documents(self, user_id: str) -> list[Document]:
        return self._db.query(Document).filter(Document.user_id == user_id).order_by(Document.created_at.desc()).all()

    def get_user_document(self, document_id: str, user_id: str) -> Document | None:
        return self._db.query(Document).filter(Document.id == document_id, Document.user_id == user_id).first()

    def count_user_documents(self, user_id: str) -> int:
        return self._db.query(Document).filter(Document.user_id == user_id).count()
