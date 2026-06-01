# Action Planning - Générateur de Planning de Déchargement

> Outil interne pour les magasins **Action** permettant d'optimiser l'assignation des charrettes aux employés en fonction de leurs disponibilités, compétences et contraintes horaires.

---

Test possible sur https://action-planning-2024.vercel.app
Si vous êtes interessés, n'hesitez pas à me contacter à jeremy.chaze@icloud.com

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

## API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/personnel/` | Liste tout le personnel |
| POST | `/api/personnel/` | Ajouter un employé |
| PUT | `/api/personnel/{id}` | Modifier un employé |
| DELETE | `/api/personnel/{id}` | Supprimer un employé |
| POST | `/api/planning/generer` | Générer un planning |
| GET | `/api/health` | Healthcheck |

```
## Auteur
Développé par Jérémy CHAZE - Version Beta 3.0
