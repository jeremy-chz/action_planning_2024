"""
CONFIGURATION DES RÈGLES DE PAUSES
Ajustement des horaires sans toucher à l'algorithme.
Les heures sont en décimal : 8.5 = 8h30, 14.75 = 14h45
"""

# ─── 30h Après-midi ───────────────────────────────────────────────────────────
PAUSE_30H_APREM = {
    "duree":          30,
    "cascade_debut":  15.5,  # 14h30 pour le 1er employé
    "cascade_ecart":  0.5,   # 30 min entre chaque employé
}

PAUSE_35H_MATIN_PETITE = {
    "duree":          15,
    "avant_fin":      1.75,  # ~1h45 avant la fin (flexible)
    "cascade_ecart":  0.25,  # 15 min entre chaque employé
}

# ─── 35h Après-midi ───────────────────────────────────────────────────────────
PAUSE_35H_APREM_GROSSE = {
    "duree":          30,
    "cascade_debut":  13.0,  # 13h00 pour le 1er employé
    "cascade_ecart":  0.5,   # 30 min entre chaque employé
}

PAUSE_35H_APREM_PETITE = {
    "duree":          15,
    "cascade_debut":  17.75, # 17h45 pour le 1er employé
    "cascade_ecart":  0.25,  # 15 min entre chaque employé
}