from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class LogConnexion(Base):
    __tablename__ = "logs_connexion"

    id            = Column(Integer, primary_key=True, index=True)
    magasin_login = Column(String(100), nullable=False, index=True)
    magasin_nom   = Column(String(100), nullable=True)
    ip            = Column(String(64), nullable=False)
    succes        = Column(Boolean, nullable=False)
    date          = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
