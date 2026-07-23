from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    document_ids: list[str]
    question: str
    action: str = "qna"


class Source(BaseModel):
    document_id: str
    filename: str
    page_number: int


class ChatResponse(BaseModel):
    conversation_id: str
    answer: str
    sources: list[Source]


class ConversationResponse(BaseModel):
    id: str
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: str
    title: str
    created_at: datetime
    messages: list[MessageResponse]

    model_config = {"from_attributes": True}


class ConversationRename(BaseModel):
    title: str
