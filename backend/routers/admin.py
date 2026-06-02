from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from database import get_db
from models.magasin import Magasin
from models.log_connexion import LogConnexion
from services.auth import hash_password
from routers.auth import get_current_admin

router = APIRouter()

class MagasinCreate(BaseModel):
    login: str
    password: str
    nom: str

class MagasinUpdate(BaseModel):
    password: Optional[str] = None
    nom: Optional[str] = None

@router.get("/magasins")
def list_magasins(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    return db.query(Magasin).all()

@router.post("/magasins", status_code=201)
def create_magasin(data: MagasinCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    if db.query(Magasin).filter(Magasin.login == data.login).first():
        raise HTTPException(status_code=400, detail="Login déjà utilisé")
    m = Magasin(login=data.login, password_h=hash_password(data.password), nom=data.nom)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

@router.put("/magasins/{id}")
def update_magasin(id: int, data: MagasinUpdate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    m = db.query(Magasin).filter(Magasin.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Magasin non trouvé")
    if data.password:
        m.password_h = hash_password(data.password)
    if data.nom:
        m.nom = data.nom
    db.commit()
    return m

@router.delete("/magasins/{id}")
def delete_magasin(id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    m = db.query(Magasin).filter(Magasin.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Magasin non trouvé")
    if m.is_admin:
        raise HTTPException(status_code=400, detail="Impossible de supprimer l'admin")
    db.delete(m)
    db.commit()
    return {"success": True}


@router.get("/logs")
def get_logs(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    logs = (
        db.query(LogConnexion)
        .order_by(LogConnexion.date.desc())
        .limit(200)
        .all()
    )

    # Détecter les magasins avec plusieurs IP différentes aujourd'hui
    today = datetime.now(timezone.utc).date()
    warnings = []
    logins_today = db.query(
        LogConnexion.magasin_login,
        LogConnexion.magasin_nom,
        func.count(func.distinct(LogConnexion.ip)).label("nb_ip")
    ).filter(
        LogConnexion.succes == True,
        cast(LogConnexion.date, Date) == today,
    ).group_by(LogConnexion.magasin_login, LogConnexion.magasin_nom).all()

    for row in logins_today:
        if row.nb_ip > 1:
            warnings.append(f"{row.magasin_nom or row.magasin_login} connecté depuis {row.nb_ip} IP différentes aujourd'hui")

    return {
        "logs": [
            {
                "id":            l.id,
                "magasin_login": l.magasin_login,
                "magasin_nom":   l.magasin_nom,
                "ip":            l.ip,
                "succes":        l.succes,
                "date":          l.date.isoformat() if l.date else None,
            }
            for l in logs
        ],
        "warnings": warnings,
    }