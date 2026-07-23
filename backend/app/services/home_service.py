from __future__ import annotations

import json
import logging
import os
import time
import uuid
from pathlib import Path

import fitz
from fastapi import UploadFile

from app.core.config import settings
from app.services.embedding_service import generate_embedding, generate_embeddings_batch
from app.services.llm_service import call_llm

logger = logging.getLogger(__name__)

_sessions: dict[str, dict] = {}
_SESSION_TTL = 3600


def _cleanup_stale():
    now = time.time()
    stale = [sid for sid, s in _sessions.items() if now - s["created_at"] > _SESSION_TTL]
    for sid in stale:
        del _sessions[sid]


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


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if not norm_a or not norm_b:
        return 0.0
    return dot / (norm_a * norm_b)


def _search_chunks(question_embedding: list[float], chunks: list[dict], top_k: int = 5) -> list[dict]:
    scored = []
    for c in chunks:
        emb = c["embedding"]
        sim = _cosine_similarity(question_embedding, emb)
        scored.append((sim, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_k]

    return [
        {
            "text": c["text"],
            "page_number": c["page_number"],
            "filename": c["filename"],
            "similarity": sim,
        }
        for sim, c in top
    ]


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



def upload_file(file: UploadFile) -> dict:
    _cleanup_stale()

    ext = Path(file.filename).suffix.lower()
    if ext not in settings.allowed_extensions:
        raise ValueError(f"Unsupported file type: {ext}")

    filename = file.filename
    tmp_path = os.path.join(settings.upload_dir, f"tmp_{uuid.uuid4()}_{filename}")
    os.makedirs(settings.upload_dir, exist_ok=True)

    content = file.file.read()
    with open(tmp_path, "wb") as f:
        f.write(content)

    try:
        pages = _extract_text_pages(tmp_path)
        all_chunks = []
        all_texts = []

        for page_number, text in pages:
            page_chunks = _chunk_text(text, page_number, settings.chunk_size, settings.chunk_overlap)
            for c in page_chunks:
                all_chunks.append(c)
                all_texts.append(c["text"])

        embeddings = generate_embeddings_batch(all_texts)

        session_chunks = []
        for chunk, emb in zip(all_chunks, embeddings):
            session_chunks.append({
                "text": chunk["text"],
                "page_number": chunk["page_number"],
                "filename": filename,
                "embedding": emb,
            })

        session_id = str(uuid.uuid4())
        _sessions[session_id] = {
            "chunks": session_chunks,
            "created_at": time.time(),
            "filename": filename,
            "history": [],
        }

        logger.info("Created home session %s with %d chunks for %s", session_id, len(session_chunks), filename)
        return {"session_id": session_id, "filename": filename, "chunks": len(session_chunks), "pages": len(pages)}
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def ask_question(session_id: str, question: str, action: str = "qna") -> dict:
    session = _sessions.get(session_id)
    if not session:
        raise ValueError("Session not found or expired. Please upload the document again.")

    question_emb = generate_embedding(question)
    chunks = _search_chunks(question_emb, session["chunks"], settings.top_k)

    history = session.get("history") or []
    messages = _build_prompt(question, chunks, history, action)
    answer = call_llm(messages)

    session["history"].append({"role": "user", "content": question})
    session["history"].append({"role": "assistant", "content": answer})

    sources = []
    seen = set()
    for ch in chunks:
        key = (ch["filename"], ch["page_number"])
        if key not in seen:
            seen.add(key)
            sources.append({
                "filename": ch["filename"],
                "page_number": ch["page_number"],
            })

    return {
        "answer": answer,
        "sources": sources,
        "filename": session["filename"],
    }
