# Action Planning - Générateur de Planning de Déchargement

> Outil interne pour les magasins **Action** permettant d'optimiser l'assignation des charrettes aux employés en fonction de leurs disponibilités, compétences et contraintes horaires.

Demo : https://action-planning-2024.vercel.app
Contact : jeremy.chaze@icloud.com

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite, IBM Plex Sans |
| Backend | FastAPI (Python 3.11) |
| Base de données | SQLite (dev) / PostgreSQL (prod via Render) |
| Authentification | JWT + Bcrypt |
| Scan photos | Mistral Pixtral-12b (OCR tableau TIME) |
| Déploiement | Render (backend) + Vercel (frontend) |

---

## Fonctionnalités

- Génération de planning optimisé par algorithme de list scheduling
- Import de charrettes par scan photo (IA Mistral Pixtral), fichier CSV/XLSX ou saisie manuelle
- Configuration des employés : contrat 30h/35h, créneau matin/après-midi, pauses auto ou manuelles
- Pauses automatiques calculées selon le contrat et l'ordre en cascade
- Contraintes : coupure obligatoire 8h-9h, compétences (lourd/fragile), priorités, fenêtre de début
- Découpage des tâches (Part 1 / Part 2) si une pause coupe un créneau
- Export CSV du planning généré
- Interface multi-magasins avec gestion des accès admin

---

## Variables d'environnement (Render)

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Clé JWT (générer avec `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `ADMIN_LOGIN` | Identifiant du compte administrateur |
| `ADMIN_PASSWORD` | Mot de passe du compte administrateur |
| `MISTRAL_API_KEY` | Clé API Mistral pour le scan de photos |
| `DATABASE_URL` | URL PostgreSQL fournie par Render |

---

## Structure du projet

```
action-planning/
├── backend/
│   ├── main.py                 # Point d'entrée + création compte admin
│   ├── database.py             # Config SQLAlchemy
│   ├── requirements.txt
│   ├── .env.example            # Template variables d'environnement
│   ├── models/
│   │   ├── personnel.py        # Modèle BDD employés
│   │   ├── magasin.py          # Modèle BDD magasins
│   │   └── schemas.py          # Schémas Pydantic
│   ├── routers/
│   │   ├── auth.py             # Login / JWT
│   │   ├── admin.py            # Gestion magasins (admin)
│   │   ├── personnel.py        # CRUD employés
│   │   ├── planning.py         # Endpoint génération
│   │   └── scan.py             # OCR photos via Mistral Pixtral
│   ├── services/
│   │   ├── moteur.py           # Algorithme de planification
│   │   ├── regles_pauses.py    # Règles pauses auto par contrat
│   │   └── auth.py             # Hash / vérification JWT
│   └── tests/
│       └── test_moteur.py
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── PlanningPage.jsx
│   │   │   ├── PersonnelPage.jsx
│   │   │   ├── ResultatsPage.jsx
│   │   │   └── AdminPage.jsx
│   │   ├── components/planning/
│   │   │   ├── CharretteInput.jsx
│   │   │   └── EmployeModal.jsx
│   │   └── utils/api.js
│   └── vite.config.js
│
└── docs/
    └── ALGORITHME.md
```

---

## API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion magasin |
| GET | `/api/auth/me` | Infos magasin connecté |
| GET | `/api/personnel/` | Liste du personnel |
| POST | `/api/personnel/` | Ajouter un employé |
| PUT | `/api/personnel/{id}` | Modifier un employé |
| DELETE | `/api/personnel/{id}` | Supprimer un employé |
| POST | `/api/planning/generer` | Générer un planning |
| POST | `/api/scan/analyser` | OCR photo tableau TIME |
| GET | `/api/admin/magasins` | Liste magasins (admin) |
| GET | `/api/health` | Healthcheck |

---

## Auteur

Développé par Jérémy CHAZE - Version Beta 3.1
