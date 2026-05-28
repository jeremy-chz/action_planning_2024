from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.personnel import Personnel
from models.magasin import Magasin
from models.schemas import PersonnelCreate, PersonnelResponse
from routers.auth import get_current_magasin

router = APIRouter()

@router.get("/", response_model=List[PersonnelResponse])
def list_personnel(
    db: Session = Depends(get_db),
    magasin: Magasin = Depends(get_current_magasin)
):
    return db.query(Personnel).filter(Personnel.magasin_id == magasin.id).order_by(Personnel.nom).all()

@router.post("/", response_model=PersonnelResponse, status_code=201)
def create_personnel(
    data: PersonnelCreate,
    db: Session = Depends(get_db),
    magasin: Magasin = Depends(get_current_magasin)
):
    employe = Personnel(nom=data.nom, poste=data.poste, magasin_id=magasin.id)
    db.add(employe)
    db.commit()
    db.refresh(employe)
    return employe

@router.put("/{id}", response_model=PersonnelResponse)
def update_personnel(
    id: int,
    data: PersonnelCreate,
    db: Session = Depends(get_db),
    magasin: Magasin = Depends(get_current_magasin)
):
    employe = db.query(Personnel).filter(Personnel.id == id, Personnel.magasin_id == magasin.id).first()
    if not employe:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    employe.nom = data.nom
    employe.poste = data.poste
    db.commit()
    db.refresh(employe)
    return employe

@router.delete("/{id}")
def delete_personnel(
    id: int,
    db: Session = Depends(get_db),
    magasin: Magasin = Depends(get_current_magasin)
):
    employe = db.query(Personnel).filter(Personnel.id == id, Personnel.magasin_id == magasin.id).first()
    if not employe:
        raise HTTPException(status_code=404, detail="Employé non trouvé")
    db.delete(employe)
    db.commit()
    return {"success": True}
