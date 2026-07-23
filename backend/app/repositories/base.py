from __future__ import annotations

from typing import Generic, TypeVar

from sqlalchemy.orm import Session

from app.core.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    def __init__(self, db: Session, model: type[ModelType]):
        self._db = db
        self._model = model

    def get_by_id(self, id: str) -> ModelType | None:
        return self._db.query(self._model).filter(self._model.id == id).first()

    def list(self, **filters) -> list[ModelType]:
        q = self._db.query(self._model)
        for field, value in filters.items():
            if hasattr(self._model, field):
                q = q.filter(getattr(self._model, field) == value)
        return q.all()

    def create(self, entity: ModelType) -> ModelType:
        self._db.add(entity)
        self._db.commit()
        self._db.refresh(entity)
        return entity

    def delete(self, entity: ModelType) -> None:
        self._db.delete(entity)
        self._db.commit()
