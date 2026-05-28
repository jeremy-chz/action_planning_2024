import os
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from models.magasin import Magasin

SECRET_KEY = os.environ.get("SECRET_KEY", "change-this-in-production-please")
ALGORITHM  = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(magasin_id: int) -> str:
    return jwt.encode({"sub": str(magasin_id)}, SECRET_KEY, algorithm=ALGORITHM)

def get_magasin_from_token(token: str, db: Session) -> Magasin | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        magasin_id = int(payload.get("sub"))
        return db.query(Magasin).filter(Magasin.id == magasin_id).first()
    except (JWTError, ValueError):
        return None