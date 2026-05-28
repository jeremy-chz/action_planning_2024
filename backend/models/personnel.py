from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base


class Personnel(Base):
    __tablename__ = "personnel"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    poste = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    magasin_id = Column(Integer, nullable=True)  # nullable pour migration douce

    def as_dict(self):
        return {
            "id": self.id,
            "nom": self.nom,
            "poste": self.poste,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
