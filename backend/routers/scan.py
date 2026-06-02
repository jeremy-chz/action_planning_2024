import os
import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import google.generativeai as genai

router = APIRouter()

class ImagePayload(BaseModel):
    images: List[str]

class CharretteScannee(BaseModel):
    barcode: str
    duration_min: int

@router.post("/analyser", response_model=List[CharretteScannee])
async def analyser_photos(payload: ImagePayload):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY non configurée")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = """Tu analyses un tableau de déchargement de conteneurs Action.
Extrait UNIQUEMENT :
- Colonne "Numéro de conteneur" : garde seulement les 4 DERNIERS chiffres
- Colonne "Total" (dernière colonne à droite) : convertis HH:MM:SS en minutes arrondies au plus proche

Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans explication :
[{"barcode": "7386", "duration_min": 32}, ...]

Inclus toutes les lignes visibles. Si une valeur est illisible, ignore la ligne."""

    parts = []
    for b64 in payload.images:
        if "," in b64:
            header, b64 = b64.split(",", 1)
            media_type = header.split(":")[1].split(";")[0] if ":" in header else "image/jpeg"
        else:
            media_type = "image/jpeg"
        parts.append({"mime_type": media_type, "data": b64})

    parts.append(prompt)

    try:
        response = model.generate_content(parts)
        text = re.sub(r"```json|```", "", response.text.strip()).strip()
        data = json.loads(text)
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
