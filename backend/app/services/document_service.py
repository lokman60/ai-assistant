import json
import logging
import os
import uuid
from pathlib import Path

import fitz
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.chunk import Chunk
from app.models.document import Document
from app.repositories.document_repo import DocumentRepository
from app.services.embedding_service import generate_embeddings_batch

logger = logging.getLogger(__name__)


def _extract_text_pages(filepath: str) -> list[tuple[int, str]]:
    pages = []
    doc = fitz.open(filepath)
    for page_num in range(len(doc)):
        text = doc[page_num].get_text()
        if text.strip():
            pages.append((page_num + 1, text))
    doc.close()
    return pages


def _chunk_text(text: str, page_number: int, chunk_size: int = 500, overlap: int = 100) -> list[dict]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk_words = words[start:end]
        chunk_text = " ".join(chunk_words)
        if chunk_text.strip():
            chunks.append({"text": chunk_text, "page_number": page_number})
        start += chunk_size - overlap
    return chunks


class DocumentService:
    def __init__(self, db: Session):
        self._repo = DocumentRepository(db)
        self._db = db

    def upload(self, user_id: str, file: UploadFile) -> Document:
        ext = Path(file.filename).suffix.lower()
        if ext not in settings.allowed_extensions:
            raise ValueError(f"Unsupported file type: {ext}")

        filename = file.filename
        doc_id = str(uuid.uuid4())
        save_path = os.path.join(settings.upload_dir, f"{doc_id}_{filename}")

        os.makedirs(settings.upload_dir, exist_ok=True)
        content = file.file.read()
        with open(save_path, "wb") as f:
            f.write(content)

        doc = Document(id=doc_id, user_id=user_id, filename=filename, title=Path(filename).stem, status="processing")
        doc = self._repo.create(doc)

        try:
            pages = _extract_text_pages(save_path)
            all_chunks = []
            all_texts = []

            for page_number, text in pages:
                page_chunks = _chunk_text(text, page_number, settings.chunk_size, settings.chunk_overlap)
                for c in page_chunks:
                    chunk = Chunk(
                        document_id=doc.id,
                        text=c["text"],
                        page_number=c["page_number"],
                    )
                    self._db.add(chunk)
                    all_chunks.append(chunk)
                    all_texts.append(c["text"])

            self._db.commit()

            embeddings = generate_embeddings_batch(all_texts)
            for chunk, emb in zip(all_chunks, embeddings):
                chunk.embedding = json.dumps(emb)
            self._db.commit()

            doc.status = "ready"
            self._db.commit()
            logger.info("Document %s processed successfully with %d chunks", doc.id, len(all_chunks))
        except Exception as e:
            doc.status = "error"
            self._db.commit()
            logger.error("Failed to process document %s: %s", doc.id, str(e))
            raise

        return doc

    def list_documents(self, user_id: str) -> list[Document]:
        return self._repo.get_user_documents(user_id)

    def delete_document(self, document_id: str, user_id: str) -> None:
        doc = self._repo.get_user_document(document_id, user_id)
        if not doc:
            raise ValueError("Document not found")
        self._repo.delete(doc)

    def rename_document(self, document_id: str, user_id: str, title: str) -> Document:
        doc = self._repo.get_user_document(document_id, user_id)
        if not doc:
            raise ValueError("Document not found")
        doc.title = title
        self._db.commit()
        self._db.refresh(doc)
        return doc
