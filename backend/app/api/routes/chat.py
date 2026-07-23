import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.core.database import get_db
from app.repositories.conversation_repo import ConversationRepository
from app.schemas.chat import ChatRequest, ConversationRename
from app.schemas.common import ErrorResponse
from app.services.rag_service import RagService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat")
def chat(body: ChatRequest, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    svc = RagService(db)
    try:
        result = svc.ask(user_id, body.question, body.document_ids, body.conversation_id, body.action)
        return {"success": True, "message": "OK", "data": result}
    except Exception as e:
        logger.exception("Chat error")
        return ErrorResponse(message=str(e))


@router.get("/conversations")
def list_conversations(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    repo = ConversationRepository(db)
    convs = repo.get_user_conversations(user_id)
    return {
        "success": True,
        "message": "OK",
        "data": {
            "conversations": [
                {"id": str(c.id), "title": c.title, "created_at": str(c.created_at)} for c in convs
            ]
        },
    }


@router.get("/conversation/{conversation_id}")
def get_conversation(conversation_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    repo = ConversationRepository(db)
    conv = repo.get_with_messages(conversation_id, user_id)
    if not conv:
        return ErrorResponse(message="Conversation not found")
    return {
        "success": True,
        "message": "OK",
        "data": {
            "id": str(conv.id),
            "title": conv.title,
            "created_at": str(conv.created_at),
            "messages": [
                {"id": str(m.id), "role": m.role, "content": m.content, "created_at": str(m.created_at)}
                for m in conv.messages
            ],
        },
    }


@router.delete("/conversation/{conversation_id}")
def delete_conversation(conversation_id: str, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    repo = ConversationRepository(db)
    conv = repo.get_by_id(conversation_id)
    if not conv or conv.user_id != user_id:
        return ErrorResponse(message="Conversation not found")
    repo.delete(conv)
    return {"success": True, "message": "Conversation deleted"}


@router.patch("/conversation/{conversation_id}")
def rename_conversation(conversation_id: str, body: ConversationRename, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    repo = ConversationRepository(db)
    conv = repo.get_by_id(conversation_id)
    if not conv or conv.user_id != user_id:
        return ErrorResponse(message="Conversation not found")
    conv.title = body.title
    db.commit()
    return {"success": True, "message": "Conversation renamed"}
