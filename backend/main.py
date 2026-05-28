"""
Action Planning - Backend FastAPI
Générateur de planning de déchargement charrettes
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, Base
from routers import personnel, planning, scan, auth, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    
    # Migration : ajouter magasin_id si elle n'existe pas
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE personnel ADD COLUMN IF NOT EXISTS magasin_id INTEGER"))
            conn.commit()
    except Exception as e:
        print(f"Migration info: {e}")
    
    # Créer le compte admin si il n'existe pas
    from sqlalchemy.orm import sessionmaker
    from models.magasin import Magasin
    from services.auth import hash_password
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        if not db.query(Magasin).filter(Magasin.login == "action-admin").first():
            admin = Magasin(
                login="action-admin",
                password_h=hash_password("ActionAdmin2024!"),
                nom="Admin",
                is_admin=True
            )
            db.add(admin)
            db.commit()
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
