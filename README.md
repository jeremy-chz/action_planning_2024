# Action Planning — Générateur de Planning de Déchargement

> Outil interne pour les magasins **Action** permettant d'optimiser l'assignation des charrettes (rolls de marchandises) aux employés en fonction de leurs disponibilités, compétences et contraintes horaires.

---

## Fonctionnalités

### Contraintes du moteur de planification (v3.0)
| Contrainte | Description |
|-----------|-------------|
| **Coupure 8h–9h** | Pause obligatoire si le créneau de l'employé chevauche 8h–9h |
| **Fenêtre de début** | Une charrette peut avoir une heure de début au plus tôt |
| **Priorités** | 3 niveaux (Urgent / Normal / Basse) — les urgentes sont assignées en premier |
| **Compétences** | Tâches nécessitant un employé qualifié (ex : chariot, frigo…) |
| **Anti-fatigue** | Pause automatique de 10 min après 2h consécutives de travail |
| **Charge max** | Limite journalière configurable par employé (défaut : 8h) |
| **Équilibrage** | L'algorithme répartit la charge équitablement entre employés |
| **Découpage** | Une tâche peut être scindée en Part 1 / Part 2 si une pause la coupe |
| **Setup time** | 2 min de délai entre chaque tâche (temps de récupération charrette) |

---

## Structure du projet

```
action-planning/
├── backend/                    # API FastAPI (Python)
│   ├── main.py                 # Point d'entrée
│   ├── database.py             # Config SQLAlchemy + SQLite
│   ├── requirements.txt
│   ├── models/
│   │   ├── personnel.py        # Modèle BDD
│   │   └── schemas.py          # Schémas Pydantic (validation)
│   ├── routers/
│   │   ├── personnel.py        # CRUD employés
│   │   └── planning.py         # Endpoint génération
│   ├── services/
│   │   └── moteur.py           # Algorithme de planification
│   └── tests/
│       └── test_moteur.py      # Tests unitaires (pytest)
│
├── frontend/                   # Interface React + Vite
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx             # Router principal
│       ├── index.css           # Thème dark industriel
│       ├── pages/
│       │   ├── PlanningPage.jsx    # Formulaire principal
│       │   ├── PersonnelPage.jsx   # Gestion du personnel
│       │   └── ResultatsPage.jsx   # Visualisation + export CSV
│       ├── components/
│       │   └── planning/
│       │       ├── CharretteInput.jsx  # Saisie charrettes + options avancées
│       │       └── EmployeModal.jsx    # Config employé (créneaux, pauses, compétences)
│       └── utils/
│           └── api.js          # Appels API backend
│
├── notebooks/
│   └── analyse_planning.ipynb  # Benchmark + visualisation Gantt
│
└── docs/
    └── ALGORITHME.md           # Documentation de l'algorithme
```

---

## Installation & lancement

### Prérequis
- Python 3.11+
- Node.js 18+

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
→ API disponible sur `http://localhost:8000`  
→ Docs Swagger : `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
→ Interface sur `http://localhost:5173`

### Tests
```bash
cd backend
pytest tests/ -v
```

### Notebook
```bash
pip install jupyter matplotlib pandas
jupyter notebook notebooks/analyse_planning.ipynb
```

---

## API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/personnel/` | Liste tout le personnel |
| POST | `/api/personnel/` | Ajouter un employé |
| PUT | `/api/personnel/{id}` | Modifier un employé |
| DELETE | `/api/personnel/{id}` | Supprimer un employé |
| POST | `/api/planning/generer` | Générer un planning |
| GET | `/api/health` | Healthcheck |

### Exemple d'appel `/api/planning/generer`
```json
{
  "charrettes": [
    { "barcode": "C001", "duration_min": 45, "priorite": 1 },
    { "barcode": "C002", "duration_min": 30, "priorite": 2, "not_before": "09:00" },
    { "barcode": "C003", "duration_min": 60, "competences_requises": ["chariot"] }
  ],
  "employes_presents": [
    {
      "nom": "Alice",
      "creneaux": [["07:00", "15:00"]],
      "pauses": [["10:00", "15"]],
      "competences": ["chariot"],
      "charge_max_min": 420
    }
  ]
}
```

---

## Algorithme (résumé)

L'algorithme est un **scheduler à liste avec backfilling** :

1. Les tâches sont triées par **priorité** puis **durée croissante**
2. À chaque itération, l'employé avec la **prochaine disponibilité la plus tôt** est sélectionné
3. La meilleure tâche compatible est assignée :
   - Directement si elle rentre dans le créneau
   - Une tâche plus petite par **backfilling** si un conflit est détecté
   - **Découpage** de la tâche si aucune alternative n'existe
4. Les contraintes (pauses, compétences, fatigue, charge max) sont vérifiées en temps réel

→ Voir `docs/ALGORITHME.md` pour la documentation complète.

---

## Auteur
Développé par **Jérémy CHAZE** — Version Beta 3.0
