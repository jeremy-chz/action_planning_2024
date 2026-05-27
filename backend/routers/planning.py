from fastapi import APIRouter, HTTPException
from models.schemas import PlanningRequest, PlanningResponse
from services.moteur import generer_planning

router = APIRouter()


@router.post("/generer", response_model=PlanningResponse)
def generer(request: PlanningRequest):
    if not request.charrettes:
        raise HTTPException(status_code=400, detail="Aucune charrette fournie")
    if not request.employes_presents:
        raise HTTPException(status_code=400, detail="Aucun employé sélectionné")

    charrettes = [c.model_dump() for c in request.charrettes]
    employes = [e.model_dump() for e in request.employes_presents]

    result = generer_planning(charrettes, employes)
    return result
