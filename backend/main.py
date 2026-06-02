"""
Action Planning - Backend FastAPI
Générateur de planning de déchargement charrettes
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Charger .env en développement local (ignoré si déjà défini par l'env système)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from database import engine, Base
from routers import personnel, planning, scan, auth, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Vérifier que SECRET_KEY est bien définie (pas la valeur par défaut en prod)
    from services.auth import SECRET_KEY
    if SECRET_KEY == "change-this-in-production-please":
        raise RuntimeError("SECRET_KEY non définie — définir la variable d'environnement SECRET_KEY")

    Base.metadata.create_all(bind=engine)

    # Migration : ajouter magasin_id si elle n'existe pas
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE personnel ADD COLUMN IF NOT EXISTS magasin_id INTEGER"))
            conn.execute(text("ALTER TABLE personnel ADD COLUMN IF NOT EXISTS contrat VARCHAR(10)"))
            conn.execute(text("ALTER TABLE personnel ADD COLUMN IF NOT EXISTS matin_debut VARCHAR(5)"))
            conn.execute(text("ALTER TABLE personnel ADD COLUMN IF NOT EXISTS matin_fin VARCHAR(5)"))
            conn.execute(text("ALTER TABLE personnel ADD COLUMN IF NOT EXISTS aprem_debut VARCHAR(5)"))
            conn.execute(text("ALTER TABLE personnel ADD COLUMN IF NOT EXISTS aprem_fin VARCHAR(5)"))
            conn.commit()
    except Exception as e:
        print(f"Migration info: {e}")

    # Créer le compte admin si il n'existe pas
    admin_login    = os.environ.get("ADMIN_LOGIN", "action-admin")
    admin_password = os.environ.get("ADMIN_PASSWORD")
    if not admin_password:
        raise RuntimeError("ADMIN_PASSWORD non définie — définir la variable d'environnement ADMIN_PASSWORD")

    from sqlalchemy.orm import sessionmaker
    from models.magasin import Magasin
    from services.auth import hash_password
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        existing = db.query(Magasin).filter(Magasin.login == admin_login).first()
        if existing:
            # Toujours resynchroniser le hash avec le password de l'env
            existing.password_h = hash_password(admin_password)
            db.commit()
            print(f"Compte admin mis à jour : {admin_login}")
        else:
            admin_account = Magasin(
                login=admin_login,
                password_h=hash_password(admin_password),
                nom="Admin",
                is_admin=True
            )
            db.add(admin_account)
            db.commit()
            print(f"Compte admin créé : {admin_login}")
    finally:
        db.close()
    yield


app = FastAPI(
    title="Action Planning API",
    description="API de génération de planning de déchargement pour magasins Action",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",
    "https://action-planning-2024.vercel.app",
    "https://action-planning-2024-git-main-jeremy-chz-s-projects.vercel.app",
    "https://action-planning-2024-qsr4hcak8-jeremy-chz-s-projects.vercel.app",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/auth",      tags=["Auth"])
app.include_router(admin.router,     prefix="/api/admin",     tags=["Admin"])
app.include_router(personnel.router, prefix="/api/personnel", tags=["Personnel"])
app.include_router(planning.router, prefix="/api/planning", tags=["Planning"])
app.include_router(scan.router, prefix="/api/scan", tags=["Scan"])



@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}
