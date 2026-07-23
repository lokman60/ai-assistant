from __future__ import annotations

import json
import logging
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.chunk import Chunk
from app.models.conversation import Conversation
from app.models.document import Document
from app.repositories.conversation_repo import ConversationRepository
from app.services.embedding_service import generate_embedding
from app.services.llm_service import call_llm

logger = logging.getLogger(__name__)


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if not norm_a or not norm_b:
        return 0.0
    return dot / (norm_a * norm_b)


def _search_chunks(db: Session, question_embedding: list[float], document_ids: list[str], top_k: int = 5) -> list[dict]:
    chunks = db.query(Chunk).filter(Chunk.document_id.in_(document_ids)).all()

    scored = []
    for c in chunks:
        if c.embedding:
            emb = json.loads(c.embedding)
            sim = _cosine_similarity(question_embedding, emb)
            scored.append((sim, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_k]

    doc_cache = {}
    results = []
    for sim, c in top:
        doc_id = c.document_id
        if doc_id not in doc_cache:
            doc = db.query(Document).filter(Document.id == doc_id).first()
            doc_cache[doc_id] = doc.filename if doc else "unknown"
        results.append({
            "text": c.text,
            "page_number": c.page_number,
            "document_id": doc_id,
            "filename": doc_cache[doc_id],
            "similarity": sim,
        })
    return results


ACTION_PROMPTS = {
    "draft": "You are an AI document assistant helping draft professional content.\n"
             "Use the provided context to draft reports, emails, proposals, and letters.\n"
             "Match the tone and style of the source documents.\n"
             "Always cite page numbers when referencing specific information.",

    "summarize": "You are an AI document assistant specialized in summarization.\n"
                 "Summarize the provided context into clear, concise key points.\n"
                 "Capture all important information while eliminating redundancy.\n"
                 "Cite page numbers for each key point.",

    "rewrite": "You are an AI document assistant helping improve text.\n"
               "Rewrite the provided content for clarity, tone, or grammar.\n"
               "Preserve the original meaning and cite page numbers.",

    "translate": "You are an AI document translator.\n"
                 "Translate the provided context into the requested language.\n"
                 "Preserve all technical terms and cite page numbers.\n"
                 "If no target language is specified, ask which language to translate to.",

    "extract": "You are an AI document assistant specialized in information extraction.\n"
               "Extract dates, names, action items, and key data from the context.\n"
               "Present the information in a structured format.\n"
               "Cite page numbers for each extracted item.",

    "compare": "You are an AI document assistant specialized in document comparison.\n"
               "Compare the provided document sections to identify changes.\n"
               "List additions, deletions, and modifications.\n"
               "Cite page numbers for each difference found.",

    "qna": "You are an AI document assistant.\n\n"
           "Answer ONLY using the provided context.\n"
           'If the answer is not present in the context, reply:\n'
           '"I couldn\'t find this information in the uploaded documents."\n\n'
           "Never invent facts.\n"
           "Always cite page numbers.",

    "generate": "You are an AI document assistant helping generate structured content.\n"
                "Use the provided notes and context to generate tables, outlines, "
                "and formatted content.\n"
                "Organize information logically and cite page numbers.",
}


def _build_prompt(question: str, context_chunks: list[dict], history: list[dict] | None = None, action: str = "qna") -> list[dict]:
    context_parts = []
    for i, ch in enumerate(context_chunks):
        context_parts.append(f"[Source {i + 1}] (Page {ch['page_number']}, Document: {ch['filename']}):\n{ch['text']}")
    context_str = "\n\n".join(context_parts)

    system_prompt = ACTION_PROMPTS.get(action, ACTION_PROMPTS["qna"])
    messages = [{"role": "system", "content": system_prompt}]

    if history:
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})

    user_prompt = f"Context:\n{context_str}\n\nRequest:\n{question}"
    messages.append({"role": "user", "content": user_prompt})

    return messages


class RagService:
    def __init__(self, db: Session):
        self._db = db
        self._conv_repo = ConversationRepository(db)

    def ask(
        self,
        user_id: str,
        question: str,
        document_ids: list[str],
        conversation_id: str | None = None,
        action: str = "qna",
    ) -> dict:
        question_emb = generate_embedding(question)
        chunks = _search_chunks(self._db, question_emb, document_ids, settings.top_k)

        history = None
        if conversation_id:
            conv = self._conv_repo.get_with_messages(conversation_id, user_id)
            if conv:
                history = [{"role": m.role, "content": m.content} for m in conv.messages]

        messages = _build_prompt(question, chunks, history, action)
        answer = call_llm(messages)

        if not conversation_id:
            title = question[:100] + ("..." if len(question) > 100 else "")
            conv = Conversation(id=str(uuid.uuid4()), user_id=user_id, title=title)
            self._conv_repo.create(conv)
            conversation_id = conv.id
        else:
            conv = self._conv_repo.get_by_id(conversation_id)

        self._conv_repo.add_message(conversation_id, "user", question)
        self._conv_repo.add_message(conversation_id, "assistant", answer)

        sources = []
        seen = set()
        for ch in chunks:
            key = (ch["document_id"], ch["page_number"])
            if key not in seen:
                seen.add(key)
                sources.append({
                    "document_id": ch["document_id"],
                    "filename": ch["filename"],
                    "page_number": ch["page_number"],
                })

        return {
            "conversation_id": conversation_id,
            "answer": answer,
            "sources": sources,
        }
