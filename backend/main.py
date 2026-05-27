"""
Action Planning - Backend FastAPI
Générateur de planning de déchargement charrettes
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, Base
from routers import personnel, planning


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
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(personnel.router, prefix="/api/personnel", tags=["Personnel"])
app.include_router(planning.router, prefix="/api/planning", tags=["Planning"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0.0"}
