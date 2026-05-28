from pydantic import BaseModel, Field
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime


# ─── Personnel ────────────────────────────────────────────────────────────────
class PersonnelCreate(BaseModel):
    nom:         str = Field(..., min_length=1, max_length=100)
    poste:       Optional[str] = None
    contrat:     Optional[str] = None   # "30h" ou "35h"
    matin_debut: Optional[str] = None
    matin_fin:   Optional[str] = None
    aprem_debut: Optional[str] = None
    aprem_fin:   Optional[str] = None


class PersonnelResponse(BaseModel):
    id:          int
    nom:         str
    poste:       Optional[str] = None
    magasin_id:  Optional[int] = None
    contrat:     Optional[str] = None
    matin_debut: Optional[str] = None
    matin_fin:   Optional[str] = None
    aprem_debut: Optional[str] = None
    aprem_fin:   Optional[str] = None

    class Config:
        from_attributes = True


# ─── Planning ─────────────────────────────────────────────────────────────────
class Charrette(BaseModel):
    barcode: str
    duration_min: int = Field(..., gt=0)
    priorite: int = Field(default=2, ge=1, le=3, description="1=urgent, 2=normal, 3=basse prio")
    not_before: Optional[str] = Field(default=None, description="HH:MM — ne pas commencer avant")
    competences_requises: List[str] = Field(default=[], description="Ex: ['chariot', 'lourd']")


class ConfigEmploye(BaseModel):
    nom:      str
    contrat:  Optional[str] = None   # "30h" ou "35h"
    type_journee: Optional[str] = None  # "matin" ou "aprem"
    creneaux: List[Tuple[str, str]] = []
    pauses:   List[Tuple[str, str]] = []
    competences:    List[str] = []
    charge_max_min: Optional[int] = Field(default=480)


class PlanningRequest(BaseModel):
    charrettes: List[Charrette]
    employes_presents: List[ConfigEmploye]


class PlanningResponse(BaseModel):
    planning: List[Dict[str, Any]]
    non_assignees: List[str]
    stats: Dict[str, Any]
    avertissements: List[str] = []
