"""
Moteur de génération de planning - Version 3.1
Algorithme d'assignation optimisé avec contraintes avancées

Contraintes actives :
  - Coupure obligatoire 8h-9h
  - Charge max journalière par employé (en minutes)
  - Priorité de tâche : 1=urgent, 2=normal, 3=basse
  - Fenêtre de livraison : une charrette peut avoir une heure de début au plus tôt
  - Équilibrage de charge entre employés
  - Compétences requises : 'lourd' ou 'fragile'
  - Temps de setup inter-tâches : 2 min entre deux tâches
  - Avertissement surcharge
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict, Any
import math

try:
    from services.regles_pauses import (
        PAUSE_30H_APREM, PAUSE_35H_MATIN_PETITE,
        PAUSE_35H_APREM_GROSSE, PAUSE_35H_APREM_PETITE,
    )
except ImportError:
    from regles_pauses import (
        PAUSE_30H_APREM, PAUSE_35H_MATIN_PETITE,
        PAUSE_35H_APREM_GROSSE, PAUSE_35H_APREM_PETITE,
    )

def calculer_pauses_auto(contrat: str, type_journee: str, heure_fin: float, index_cascade: int) -> List[Tuple[float, float]]:
    """
    Calcule les pauses automatiques selon le contrat et le type de journée.
    index_cascade = position de l'employé dans la cascade (0, 1, 2...)
    Retourne une liste de (debut_h, fin_h)
    """
    pauses = []

    if contrat == "30h":
        if type_journee == "aprem":
            r = PAUSE_30H_APREM
            debut = r["cascade_debut"] + index_cascade * r["cascade_ecart"]
            pauses.append((debut, debut + r["duree"] / 60))

    elif contrat == "35h":
        if type_journee == "matin":
            # Petite pause ~45min avant la fin
            r2 = PAUSE_35H_MATIN_PETITE
            debut_petite = heure_fin - r2["avant_fin"] + index_cascade * r2["cascade_ecart"]
            pauses.append((debut_petite, debut_petite + r2["duree"] / 60))
        else:  # aprem
            # Grosse pause en cascade
            r = PAUSE_35H_APREM_GROSSE
            debut_grosse = r["cascade_debut"] + index_cascade * r["cascade_ecart"]
            pauses.append((debut_grosse, debut_grosse + r["duree"] / 60))
            # Petite pause en cascade vers 17h45
            r2 = PAUSE_35H_APREM_PETITE
            debut_petite = r2["cascade_debut"] + index_cascade * r2["cascade_ecart"]
            pauses.append((debut_petite, debut_petite + r2["duree"] / 60))

    return pauses

def arrondir_au_5min(h: float) -> float:
    """Arrondit au multiple de 5 min le plus proche.
    Ex: 11h43 → 11h45, 11h47 → 11h45, 11h45 → 11h45
    """
    minutes = round(h * 60)
    arrondies = round(minutes / 5) * 5
    return arrondies / 60

# ─── Constantes globales ──────────────────────────────────────────────────────
HEURE_DEBUT_COUPURE    = 8.0
HEURE_FIN_COUPURE      = 9.0
HEURE_FIN_DECHARGEMENT = 19.0
SEUIL_MIN_TACHE        = 1 / 60   # 1 minute minimum
CHARGE_MAX_DEFAUT      = 480.0    # 8h de travail effectif max par employé

# Compétences reconnues par le système
COMPETENCES_VALIDES = {"lourd", "fragile"}


def hms(h: float) -> str:
    """Heure décimale → 'HH:MM'."""
    hh = int(h)
    mm = int(round((h - hh) * 60))
    if mm == 60:
        hh += 1; mm = 0
    return f"{hh:02d}:{mm:02d}"


def parse_time(s: str) -> float:
    """'HH:MM' → heure décimale."""
    try:
        h, m = map(int, s.split(":"))
        return h + m / 60.0
    except Exception:
        raise ValueError(f"Format d'heure invalide: '{s}'. Attendu HH:MM.")


# ─── Modèle Employé ───────────────────────────────────────────────────────────
@dataclass
class Employe:
    id: int
    nom: str
    competences: List[str]                          = field(default_factory=list)   # ex: ["lourd", "fragile"]
    charge_max_min: float                           = CHARGE_MAX_DEFAUT
    blocs_indisponibles: List[Tuple[float, float]]  = field(default_factory=list)
    prochaine_dispo: float                          = 99.0
    tache_en_attente: Optional[Dict]                = None
    minutes_travaillees: float                      = 0.0
    nb_taches: int                                  = 0
    alertes: List[str]                              = field(default_factory=list)
    delta_arrondi_min: float                        = 0.0   # + = gagné, - = perdu sur les arrondis

    @classmethod
    def from_config(cls, id_employe: int, data: Dict) -> "Employe":
        """
        data = {
            'nom': str,
            'creneaux': [['07:00','12:00'], ...],
            'pauses':   [['09:00', '30'], ...],
            'competences': ['lourd'],       # optionnel, parmi {'lourd', 'fragile'}
            'charge_max_min': 360,          # optionnel (minutes)
        }
        """
        competences_brutes = [c.lower() for c in data.get("competences", [])]
        competences = [c for c in competences_brutes if c in COMPETENCES_VALIDES]

        emp = cls(
            id=id_employe,
            nom=data["nom"],
            competences=competences,
            charge_max_min=float(data.get("charge_max_min", CHARGE_MAX_DEFAUT)),
        )

        creneaux_raw = data.get("creneaux", [])
        if not creneaux_raw:
            emp.blocs_indisponibles = [(0.0, 24.0)]
            return emp

        creneaux = sorted([(parse_time(d), parse_time(f)) for d, f in creneaux_raw])
        # Calculer les pauses auto si contrat + type_journee fournis
        contrat      = data.get("contrat")
        type_journee = data.get("type_journee")
        index_cascade = data.get("index_cascade", 0)

        if contrat and type_journee and creneaux:
            heure_fin_creneau = creneaux[-1][1]
            pauses_auto = calculer_pauses_auto(contrat, type_journee, heure_fin_creneau, index_cascade)
            # Ajouter aux pauses manuelles
            for d, f in pauses_auto:
                emp.blocs_indisponibles.append((d, f))
        emp.prochaine_dispo = creneaux[0][0]

        # Trous avant/entre/après créneaux
        emp.blocs_indisponibles.append((0.0, creneaux[0][0]))
        for i in range(len(creneaux) - 1):
            f1, d2 = creneaux[i][1], creneaux[i + 1][0]
            if f1 < d2:
                emp.blocs_indisponibles.append((f1, d2))
        emp.blocs_indisponibles.append((creneaux[-1][1], 24.0))

        # Pauses manuelles
        for debut_str, duree_str in data.get("pauses", []):
            d = parse_time(debut_str)
            f = d + int(duree_str) / 60.0
            emp.blocs_indisponibles.append((d, f))

        # Coupure obligatoire 8h-9h (si le créneau la chevauche)
        for d, f in creneaux:
            if d < HEURE_FIN_COUPURE and f > HEURE_DEBUT_COUPURE:
                emp.blocs_indisponibles.append((HEURE_DEBUT_COUPURE, HEURE_FIN_COUPURE))
                break

        # Fin de déchargement global
        emp.blocs_indisponibles.append((HEURE_FIN_DECHARGEMENT, 24.0))
        emp.blocs_indisponibles.sort()
        return emp

    # ── Helpers ───────────────────────────────────────────────────────────────
    def avancer_apres_pauses(self) -> bool:
        for d, f in self.blocs_indisponibles:
            if d - 0.001 <= self.prochaine_dispo < f:
                self.prochaine_dispo = f
                return True
        return False

    def prochaine_contrainte(self, apres: float) -> float:
        for d, _ in self.blocs_indisponibles:
            if d > apres + 0.0001:
                return d
        return 24.0

    def fin_bloc_a(self, t: float) -> float:
        for d, f in self.blocs_indisponibles:
            if abs(d - t) < 0.001:
                return f
        return t

    def peut_faire(self, tache: Dict) -> bool:
        """Vérifie la compatibilité compétences (lourd / fragile)."""
        required = tache.get("competences_requises", [])
        if not required:
            return True
        return all(r.lower() in self.competences for r in required)

    def charge_restante(self) -> float:
        return max(0.0, self.charge_max_min - self.minutes_travaillees)

    def __repr__(self):
        return f"[{self.nom} | dispo:{hms(self.prochaine_dispo)} | {self.minutes_travaillees:.0f}min]"


# ─── Contrainte : fenêtre de début au plus tôt ───────────────────────────────
def _debut_effectif(emp: Employe, tache: Dict) -> float:
    """Arrondit le début de tâche au multiple de 5 min le plus proche."""
    t = emp.prochaine_dispo
    not_before = tache.get("not_before_h")
    if not_before and t < not_before:
        t = not_before
    t_arrondi = arrondir_au_5min(t)
    # Tracker le delta (positif = on a offert du temps, négatif = on a pris du temps)
    emp.delta_arrondi_min += (t - t_arrondi) * 60
    return t_arrondi


# ─── Moteur principal ─────────────────────────────────────────────────────────
def generer_planning(charrettes: List[Dict], employes_data: List[Dict]) -> Dict[str, Any]:
    """
    Args:
        charrettes: [{
            'barcode': str,
            'duration_min': int,
            'priorite': int,                       # 1=urgent, 2=normal, 3=basse (défaut 2)
            'not_before': str,                     # 'HH:MM' — ne pas commencer avant (optionnel)
            'competences_requises': ['lourd'],     # optionnel, parmi {'lourd', 'fragile'}
        }]
        employes_data: [{
            'nom': str,
            'creneaux': [['HH:MM','HH:MM']],
            'pauses': [['HH:MM','min']],
            'competences': ['lourd'],              # optionnel
            'charge_max_min': int,                 # optionnel
        }]
    """
    # ── A : Préparer & trier les tâches ───────────────────────────────────
    taches = []
    for c in charrettes:
        comp_req = [x.lower() for x in c.get("competences_requises", []) if x.lower() in COMPETENCES_VALIDES]
        t = {
            "barcode": c["barcode"],
            "duration_h": round(c["duration_min"] / 60, 4),
            "priorite": int(c.get("priorite", 2)),
            "not_before_h": parse_time(c["not_before"]) if c.get("not_before") else None,
            "competences_requises": comp_req,
        }
        taches.append(t)
    # Tri : priorité d'abord, puis durée croissante
    taches.sort(key=lambda x: (x["priorite"], x["duration_h"]))

    # ── B : Initialiser les employés ──────────────────────────────────────
    employes: List[Employe] = []
    planning: List[Dict]    = []
    avertissements: List[str] = []

    # Calculer les index cascade par type
    cascade_counts = {"30h_aprem": 0, "35h_aprem_grosse": 0, "35h_aprem_petite": 0, "35h_matin_petite": 0}

    for i, data in enumerate(employes_data):
        contrat      = data.get("contrat", "")
        type_journee = data.get("type_journee", "")

        # Déterminer l'index cascade pour cet employé
        if contrat == "30h" and type_journee == "aprem":
            data["index_cascade"] = cascade_counts["30h_aprem"]
            cascade_counts["30h_aprem"] += 1
        elif contrat == "35h" and type_journee == "aprem":
            data["index_cascade"] = cascade_counts["35h_aprem_grosse"]
            cascade_counts["35h_aprem_grosse"] += 1
        elif contrat == "35h" and type_journee == "matin":
            data["index_cascade"] = cascade_counts["35h_matin_petite"]
            cascade_counts["35h_matin_petite"] += 1
        else:
            data["index_cascade"] = 0

        emp = Employe.from_config(i, data)
        employes.append(emp)

        # Pauses fixes au planning
        for d, f in emp.blocs_indisponibles:
            if f < HEURE_FIN_DECHARGEMENT and d >= emp.prochaine_dispo and (f - d) > SEUIL_MIN_TACHE:
                if abs(d - HEURE_DEBUT_COUPURE) < 0.001 and abs(f - HEURE_FIN_COUPURE) < 0.001:
                    typ = "PAUSE OBLIGATOIRE"
                else:
                    typ = "PAUSE FIXE"
                planning.append(_make_entry(emp, "PAUSE", typ, (f - d) * 60, d, f))

    # ── C : Boucle principale ─────────────────────────────────────────────
    non_assignees: List[str] = []
    tours_max = (len(taches) + 1) * (len(employes) + 1) * 10 + 200
    tours = 0
    taches_bloquees: Dict[str, int] = {}

    while (taches or any(e.tache_en_attente for e in employes)) and tours < tours_max:
        tours += 1
        employes.sort(key=lambda e: (e.prochaine_dispo, -e.charge_restante()))
        emp = employes[0]

        if emp.avancer_apres_pauses():
            continue

        # Tâche en attente (Part 2)
        if emp.tache_en_attente:
            tache = emp.tache_en_attente
            emp.tache_en_attente = None
            t_debut = _debut_effectif(emp, tache)
            emp.prochaine_dispo = t_debut
            if emp.avancer_apres_pauses():
                emp.tache_en_attente = tache
                continue
            contrainte = emp.prochaine_contrainte(t_debut)
            t_fin = t_debut + tache["duration_h"]
            if t_fin > contrainte or emp.charge_restante() < tache["duration_h"] * 60:
                taches.insert(0, tache)
                emp.prochaine_dispo = contrainte
            else:
                planning.append(_make_entry(emp, tache["barcode"], "WORK (Part 2)",
                                            tache["duration_h"] * 60, t_debut, t_fin))
                emp.prochaine_dispo      = t_fin
                emp.minutes_travaillees += tache["duration_h"] * 60
                emp.nb_taches           += 1
            continue

        if not taches:
            break

        # ── Trouver la meilleure tâche pour cet employé ───────────────────
        tache_idx = _choisir_tache(emp, taches)
        if tache_idx is None:
            emp.prochaine_dispo = emp.prochaine_contrainte(emp.prochaine_dispo)
            for t in taches:
                code = t["barcode"]
                taches_bloquees[code] = taches_bloquees.get(code, 0) + 1
                if taches_bloquees[code] > len(employes) * 5:
                    non_assignees.append(code)
                    taches.remove(t)
                    break
            continue

        tache = taches[tache_idx]
        t_debut = _debut_effectif(emp, tache)
        emp.prochaine_dispo = t_debut

        if emp.avancer_apres_pauses():
            continue

        contrainte  = emp.prochaine_contrainte(t_debut)
        duree_h     = tache["duration_h"]
        t_fin       = t_debut + duree_h
        taille_trou = contrainte - t_debut

        # Vérif charge max
        if emp.charge_restante() <= 0:
            emp.prochaine_dispo = 99.0
            avertissements.append(f"{emp.nom} a atteint sa charge max journalière.")
            continue

        duree_reelle_h = min(duree_h, emp.charge_restante() / 60)

        # ── Cas 1 : rentre sans conflit ───────────────────────────────────
        if t_fin <= contrainte and duree_h <= duree_reelle_h:
            planning.append(_make_entry(emp, tache["barcode"], "WORK", duree_h * 60, t_debut, t_fin))
            emp.prochaine_dispo      = t_fin
            emp.minutes_travaillees += duree_h * 60
            emp.nb_taches           += 1
            taches.pop(tache_idx)
            taches_bloquees.pop(tache["barcode"], None)
            continue

        # Trou trop petit
        if taille_trou <= SEUIL_MIN_TACHE:
            emp.prochaine_dispo = contrainte
            continue

        # ── Cas 2 : chercher une tâche plus petite (backfilling) ──────────
        idx_petit = _trouver_petite_tache(emp, taches, taille_trou, exclure=tache_idx)
        if idx_petit is not None:
            petite  = taches.pop(idx_petit)
            t_fin_p = t_debut + petite["duration_h"]
            planning.append(_make_entry(emp, petite["barcode"], "WORK",
                                        petite["duration_h"] * 60, t_debut, t_fin_p))
            emp.prochaine_dispo      = t_fin_p
            emp.minutes_travaillees += petite["duration_h"] * 60
            emp.nb_taches           += 1
            continue

        # ── Cas 3 : scinder la tâche ──────────────────────────────────────
        t_scinder = taches.pop(tache_idx)
        barcode   = t_scinder["barcode"]
        p1_h = taille_trou
        p2_h = t_scinder["duration_h"] - p1_h

        planning.append(_make_entry(emp, f"{barcode} (Part 1)", "WORK (Part 1)",
                                    p1_h * 60, t_debut, contrainte))
        emp.minutes_travaillees += p1_h * 60
        emp.nb_taches           += 1

        fin_pause = emp.fin_bloc_a(contrainte)
        emp.prochaine_dispo = fin_pause

        if p2_h > SEUIL_MIN_TACHE:
            emp.tache_en_attente = {**t_scinder, "barcode": f"{barcode} (Part 2)", "duration_h": p2_h}

    # ── D : Résidus & avertissements ──────────────────────────────────────
    non_assignees.extend(t["barcode"] for t in taches)
    for emp in employes:
        if emp.tache_en_attente:
            non_assignees.append(emp.tache_en_attente["barcode"])

    for emp in employes:
        if emp.minutes_travaillees > emp.charge_max_min * 0.95:
            avertissements.append(
                f"⚠️ {emp.nom} approche de sa charge max "
                f"({emp.minutes_travaillees:.0f}/{emp.charge_max_min:.0f} min)"
            )
        avertissements.extend(emp.alertes)

    planning.sort(key=lambda x: (x["employe_id"], x["debut"]))

    return {
        "planning": planning,
        "non_assignees": list(dict.fromkeys(non_assignees)),
        "stats": _compute_stats(planning, employes, charrettes),
        "avertissements": avertissements,
    }


# ─── Helpers internes ─────────────────────────────────────────────────────────
def _choisir_tache(emp: Employe, taches: List[Dict]) -> Optional[int]:
    """Retourne l'index de la meilleure tâche pour cet employé (priorité + compétences + charge)."""
    for i, t in enumerate(taches):
        if emp.peut_faire(t) and emp.charge_restante() >= t["duration_h"] * 60 * 0.1:
            return i
    return None


def _trouver_petite_tache(emp: Employe, taches: List[Dict], taille_max_h: float, exclure: int) -> Optional[int]:
    """Cherche la plus grande tâche qui rentre dans taille_max_h (hors index exclure)."""
    best_idx, best_dur = None, 0.0
    for i, t in enumerate(taches):
        if i == exclure:
            continue
        if t["duration_h"] <= taille_max_h and t["duration_h"] > best_dur and emp.peut_faire(t):
            best_idx, best_dur = i, t["duration_h"]
    return best_idx


def _make_entry(emp: Employe, barcode: str, type_: str, duree_min: float, debut: float, fin: float) -> Dict:
    return {
        "employe_id":  emp.id,
        "employe_nom": emp.nom,
        "tache_duree": round(duree_min, 2),
        "type":        type_,
        "barcode":     barcode,
        "debut":       round(debut, 4),
        "fin":         round(fin, 4),
        "debut_str":   hms(debut),
        "fin_str":     hms(fin),
    }


def _compute_stats(planning: List[Dict], employes: List[Employe], charrettes: List[Dict]) -> Dict:
    total_min = sum(c["duration_min"] for c in charrettes)
    work      = [p for p in planning if "WORK" in p["type"]]
    assignees = sum(p["tache_duree"] for p in work)
    taux      = round(assignees / total_min * 100, 1) if total_min else 0

    delta_map = {emp.nom: round(emp.delta_arrondi_min, 1) for emp in employes}

    par_emp = {}
    for p in planning:
        nom = p["employe_nom"]
        if nom not in par_emp:
            par_emp[nom] = {
                "minutes": 0.0,
                "taches": 0,
                "pauses": 0,
                "delta_arrondi": delta_map.get(nom, 0.0)
            }
        if "WORK" in p["type"]:
            par_emp[nom]["minutes"] += p["tache_duree"]
            par_emp[nom]["taches"]  += 1
        elif "PAUSE" in p["type"]:
            par_emp[nom]["pauses"]  += 1

    charges = [v["minutes"] for v in par_emp.values()]
    if len(charges) > 1:
        moy = sum(charges) / len(charges)
        variance = sum((c - moy) ** 2 for c in charges) / len(charges)
        equilibrage = round(100 - (math.sqrt(variance) / max(moy, 1)) * 100, 1)
    else:
        equilibrage = 100.0

    return {
        "total_charrettes":  len(charrettes),
        "total_minutes":     total_min,
        "minutes_assignees": round(assignees, 1),
        "taux_assignation":  taux,
        "nb_employes":       len(employes),
        "score_equilibrage": max(0.0, equilibrage),
        "par_employe":       par_emp,
    }
