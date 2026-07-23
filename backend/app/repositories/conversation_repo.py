from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models.conversation import Conversation
from app.models.message import Message
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    def __init__(self, db: Session):
        super().__init__(db, Conversation)

    def get_user_conversations(self, user_id: str) -> list[Conversation]:
        return self._db.query(Conversation).filter(Conversation.user_id == user_id).order_by(Conversation.created_at.desc()).all()

    def get_with_messages(self, conversation_id: str, user_id: str) -> Conversation | None:
        return (
            self._db.query(Conversation)
            .options(joinedload(Conversation.messages))
            .filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
            .first()
        )

    def add_message(self, conversation_id: str, role: str, content: str) -> Message:
        msg = Message(conversation_id=conversation_id, role=role, content=content)
        self._db.add(msg)
        self._db.commit()
        self._db.refresh(msg)
        return msg
