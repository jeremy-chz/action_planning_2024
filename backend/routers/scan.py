import os
import base64
import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import google.generativeai as genai

router = APIRouter()

class ImagePayload(BaseModel):
    images: List[str]  # liste de base64

class CharretteScannee(BaseModel):
    barcode: str
    duration_min: int

@router.post("/analyser", response_model=List[CharretteScannee])
async def analyser_photos(payload: ImagePayload):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY non configurée")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    # Construire le contenu : toutes les images + le prompt
    parts = []
    for b64 in payload.images:
        # Retirer le préfixe data:image/...;base64, si présent
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        parts.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": b64
            }
        })

    parts.append("""
Tu analyses un tableau de déchargement de conteneurs Action.
Extrait UNIQUEMENT :
- Colonne "Numéro de conteneur" : garde seulement les 4 DERNIERS chiffres
- Colonne "Total" (dernière colonne à droite) : convertis HH:MM:SS en minutes arrondies au plus proche

Réponds UNIQUEMENT avec un JSON valide, rien d'autre, sans markdown, sans explication :
[{"barcode": "7386", "duration_min": 32}, ...]

Inclus toutes les lignes visibles, même barrées.
Si une valeur est illisible, ignore cette ligne.
""")

    try:
        response = model.generate_content(parts)
        text = response.text.strip()

        # Nettoyer si Gemini met des backticks malgré tout
        text = re.sub(r"```json|```", "", text).strip()

        data = json.loads(text)

        # Valider et nettoyer
        result = []
        for item in data:
            barcode = str(item.get("barcode", "")).strip()
            duration_min = int(item.get("duration_min", 0))
            if barcode and duration_min > 0:
                result.append(CharretteScannee(barcode=barcode, duration_min=duration_min))

        return result

    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Gemini n'a pas renvoyé du JSON valide")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))