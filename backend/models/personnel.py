from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base


class Personnel(Base):
    __tablename__ = "personnel"

    id         = Column(Integer, primary_key=True, index=True)
    nom        = Column(String(100), nullable=False)
    poste      = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    magasin_id = Column(Integer, nullable=True)

    # Template
    contrat      = Column(String(10), nullable=True)   # "30h" ou "35h"
    matin_debut  = Column(String(5),  nullable=True)   # "06:00"
    matin_fin    = Column(String(5),  nullable=True)   # "12:30"
    aprem_debut  = Column(String(5),  nullable=True)   # "13:30"
    aprem_fin    = Column(String(5),  nullable=True)   # "19:00"

    def as_dict(self):
        return {
            "id":          self.id,
            "nom":         self.nom,
            "poste":       self.poste,
            "magasin_id":  self.magasin_id,
            "contrat":     self.contrat,
            "matin_debut": self.matin_debut,
            "matin_fin":   self.matin_fin,
            "aprem_debut": self.aprem_debut,
            "aprem_fin":   self.aprem_fin,
        }