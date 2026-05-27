"""
Tests unitaires pour le moteur de planning
"""
import pytest
from services.moteur import generer_planning, parse_time, hms


# ─── Tests utilitaires ────────────────────────────────────────────────────────
def test_parse_time():
    assert parse_time("07:00") == 7.0
    assert parse_time("09:30") == 9.5
    assert parse_time("12:15") == pytest.approx(12.25)


def test_hms():
    assert hms(7.0) == "07:00"
    assert hms(9.5) == "09:30"
    assert hms(12.25) == "12:15"


# ─── Tests du moteur ──────────────────────────────────────────────────────────
BASE_EMPLOYE = {
    "nom": "Test",
    "creneaux": [["07:00", "19:00"]],
    "pauses": [],
}


def test_assignation_simple():
    charrettes = [{"barcode": "A001", "duration_min": 30}]
    employes = [BASE_EMPLOYE]
    result = generer_planning(charrettes, employes)
    assert len(result["non_assignees"]) == 0
    work = [p for p in result["planning"] if "WORK" in p["type"]]
    assert len(work) == 1
    assert work[0]["barcode"] == "A001"


def test_multiple_charrettes():
    charrettes = [
        {"barcode": "A001", "duration_min": 30},
        {"barcode": "A002", "duration_min": 45},
        {"barcode": "A003", "duration_min": 20},
    ]
    employes = [BASE_EMPLOYE]
    result = generer_planning(charrettes, employes)
    assert len(result["non_assignees"]) == 0
    assert result["stats"]["taux_assignation"] == 100.0


def test_coupure_8h_9h():
    """L'employé ne doit pas travailler entre 8h et 9h"""
    employe = {
        "nom": "Alice",
        "creneaux": [["07:00", "14:00"]],
        "pauses": [],
    }
    charrettes = [{"barcode": "X", "duration_min": 180}]  # 3h
    result = generer_planning(charrettes, [employe])
    for entry in result["planning"]:
        if "WORK" in entry["type"]:
            # Pas de travail entre 8h et 9h
            assert not (entry["debut"] < 9.0 and entry["fin"] > 8.0 and
                       entry["debut"] < 8.0 and entry["fin"] > 8.0 and
                       entry["debut"] >= 8.0 and entry["fin"] <= 9.0)


def test_non_assignees_quand_pas_assez_employes():
    """Si pas assez de temps, certaines charrettes ne sont pas assignées"""
    employe = {
        "nom": "Bob",
        "creneaux": [["07:00", "07:30"]],  # Seulement 30min
        "pauses": [],
    }
    charrettes = [
        {"barcode": "A001", "duration_min": 20},
        {"barcode": "A002", "duration_min": 20},  # Ne rentrera pas
    ]
    result = generer_planning(charrettes, [employe])
    assert len(result["non_assignees"]) > 0


def test_stats_completes():
    charrettes = [{"barcode": "A001", "duration_min": 60}]
    employes = [BASE_EMPLOYE]
    result = generer_planning(charrettes, employes)
    stats = result["stats"]
    assert "total_charrettes" in stats
    assert "taux_assignation" in stats
    assert "par_employe" in stats
    assert stats["total_charrettes"] == 1
    assert stats["total_minutes"] == 60
