from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models.magasin import Magasin
from models.log_connexion import LogConnexion
from services.auth import verify_password, create_token, get_magasin_from_token

router  = APIRouter()
security = HTTPBearer()

class LoginData(BaseModel):
    login: str
    password: str

def get_current_magasin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Magasin:
    magasin = get_magasin_from_token(credentials.credentials, db)
    if not magasin:
        raise HTTPException(status_code=401, detail="Token invalide")
    return magasin

def get_current_admin(magasin: Magasin = Depends(get_current_magasin)) -> Magasin:
    if not magasin.is_admin:
        raise HTTPException(status_code=403, detail="Accès admin requis")
    return magasin

def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "inconnue"

@router.post("/login")
def login(data: LoginData, request: Request, db: Session = Depends(get_db)):
    ip = _get_ip(request)
    magasin = db.query(Magasin).filter(Magasin.login == data.login).first()
    succes = bool(magasin and verify_password(data.password, magasin.password_h))

    db.add(LogConnexion(
        magasin_login=data.login,
        magasin_nom=magasin.nom if magasin else None,
        ip=ip,
        succes=succes,
    ))
    db.commit()

    if not succes:
        raise HTTPException(status_code=401, detail="Login ou mot de passe incorrect")
    return {
        "token": create_token(magasin.id),
        "nom": magasin.nom,
        "is_admin": magasin.is_admin,
    }

@router.get("/me")
def me(magasin: Magasin = Depends(get_current_magasin)):
    return {"id": magasin.id, "login": magasin.login, "nom": magasin.nom, "is_admin": magasin.is_admin}