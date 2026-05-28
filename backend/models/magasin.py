from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class Magasin(Base):
    __tablename__ = "magasins"

    id         = Column(Integer, primary_key=True, index=True)
    login      = Column(String(100), unique=True, nullable=False)
    password_h = Column(String(255), nullable=False)
    nom        = Column(String(100), nullable=False)
    is_admin   = Column(Boolean, default=False)