"""
Action Planning - Backend FastAPI
Générateur de planning de déchargement charrettes
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, Base
from routers import personnel, planning, scan


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Créer les tables au démarrage"""
    Base.metadata.create_all(bind=engine)
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

app.include_router(personnel.router, prefix="/api/personnel", tags=["Personnel"])
app.include_router(planning.router, prefix="/api/planning", tags=["Planning"])
app.include_router(scan.router, prefix="/api/scan", tags=["Scan"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}
