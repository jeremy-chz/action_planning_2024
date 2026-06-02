import os
import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from mistralai import Mistral

router = APIRouter()

class ImagePayload(BaseModel):
    images: List[str]

class CharretteScannee(BaseModel):
    barcode: str
    duration_min: int

PROMPT = """Tu analyses un tableau de déchargement de conteneurs Action.
Extrait UNIQUEMENT :
- Colonne "Numéro de conteneur" : garde seulement les 4 DERNIERS chiffres
- Colonne "Total" (dernière colonne à droite) : convertis HH:MM:SS en minutes arrondies au plus proche

Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans explication :
[{"barcode": "7386", "duration_min": 32}, ...]

Inclus toutes les lignes visibles. Si une valeur est illisible, ignore la ligne."""

@router.post("/analyser", response_model=List[CharretteScannee])
async def analyser_photos(payload: ImagePayload):
    api_key = os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="MISTRAL_API_KEY non configurée")

    client = Mistral(api_key=api_key)

    content = []
    for b64 in payload.images:
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        content.append({
            "type": "image_url",
            "image_url": f"data:image/jpeg;base64,{b64}",
        })
    content.append({"type": "text", "text": PROMPT})

    try:
        response = client.chat.complete(
            model="pixtral-12b-2409",
            messages=[{"role": "user", "content": content}],
            max_tokens=1024,
        )
        text = re.sub(r"```json|```", "", response.choices[0].message.content.strip()).strip()
        data = json.loads(text)
        result = []
        for item in data:
            barcode     = str(item.get("barcode", "")).strip()
            duration_min = int(item.get("duration_min", 0))
            if barcode and duration_min > 0:
                result.append(CharretteScannee(barcode=barcode, duration_min=duration_min))
        return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Mistral n'a pas renvoyé du JSON valide")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
