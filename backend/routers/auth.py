from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models.magasin import Magasin
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

@router.post("/login")
def login(data: LoginData, db: Session = Depends(get_db)):
    magasin = db.query(Magasin).filter(Magasin.login == data.login).first()
    if not magasin or not verify_password(data.password, magasin.password_h):
        raise HTTPException(status_code=401, detail="Login ou mot de passe incorrect")
    return {
        "token": create_token(magasin.id),
        "nom": magasin.nom,
        "is_admin": magasin.is_admin,
    }

@router.get("/me")
def me(magasin: Magasin = Depends(get_current_magasin)):
    return {"id": magasin.id, "login": magasin.login, "nom": magasin.nom, "is_admin": magasin.is_admin}