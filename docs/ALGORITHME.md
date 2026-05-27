# 🧠 Documentation de l'Algorithme de Planification

## Vue d'ensemble

Le moteur (`backend/services/moteur.py`) implémente un **scheduler à liste avec backfilling et gestion de contraintes multiples**. Il s'inspire des algorithmes de scheduling industriels (List Scheduling Algorithm) adaptés aux contraintes métier d'un magasin Action.

---

## Étapes de l'algorithme

### Étape A — Préparation des tâches
Les charrettes sont converties en tâches internes et triées par :
1. **Priorité** (1=urgent → 3=basse)
2. **Durée croissante** à priorité égale (les petites tâches servent de "bouche-trous")

### Étape B — Initialisation des employés
Pour chaque employé, on calcule ses **blocs d'indisponibilité** :
- Avant son premier créneau
- Entre deux créneaux (si horaires fractionnés)
- Ses pauses manuelles
- La coupure obligatoire 8h–9h (si applicable)
- Après la fin de service globale (19h)

### Étape C — Boucle principale

```
TANT QUE (il reste des tâches OU des tâches en attente):
    1. Trier les employés par prochaine_dispo croissante
    2. Sélectionner l'employé le plus tôt disponible (emp)
    3. Avancer la dispo de emp si elle tombe dans une pause → recommencer
    4. Vérifier la fatigue → insérer pause si > 2h consécutives
    5. Gérer une tâche "en attente" (Part 2 d'une tâche scindée)
    6. Trouver la meilleure tâche compatible pour emp
    7. Calculer la prochaine contrainte temporelle (prochain bloc indispo)
    
    CAS 1 — La tâche rentre sans conflit → ASSIGNATION DIRECTE
    CAS 2 — Conflit : chercher une tâche plus courte par BACKFILLING
    CAS 3 — Aucune tâche ne rentre → DÉCOUPAGE de la tâche
```

### Étape D — Résultats
- Les tâches non assignées sont collectées
- Les avertissements de surcharge sont générés
- Les statistiques sont calculées

---

## Contraintes détaillées

### Coupure 8h–9h
Contrainte légale/organisationnelle. Tout employé dont le créneau chevauche cette plage voit automatiquement une pause ajoutée. L'algorithme ne planifie aucune tâche sur ce créneau.

### Fenêtre de début (`not_before`)
Une charrette peut arriver plus tard (camion retardé, priorité différée). L'algorithme retarde l'assignation même si l'employé est disponible avant.

### Compétences (`competences_requises`)
Certaines charrettes nécessitent un équipement ou une qualification. Seuls les employés avec la compétence correspondante peuvent se voir assigner ces tâches.
```
LOURD → ["lourd"]
Charges lourdes → ["lourd"]
Fragile → ["fragile"]
```

### Anti-fatigue (contrainte ergonomique)
Après **120 minutes consécutives** de travail effectif, une pause de **10 minutes** est automatiquement insérée. Ce compteur est remis à zéro après chaque pause.

### Charge max journalière
Chaque employé a une limite de minutes travaillées par jour. Quand cette limite est atteinte, l'employé est marqué comme "épuisé" et n'est plus sélectionné.

### Setup time (temps inter-tâches)
**2 minutes** sont ajoutées entre chaque tâche pour simuler le temps nécessaire pour aller chercher la prochaine charrette.

### Backfilling
Si la tâche courante ne rentre pas dans le trou disponible, l'algorithme cherche (en sens inverse de la liste triée) la **plus grande tâche qui rentre**. Cela évite de laisser des "trous" inutilisés dans les plannings.

### Découpage de tâche
Si aucune tâche ne rentre dans le trou, la tâche courante est découpée :
- **Part 1** : remplit le trou jusqu'à la pause
- **Part 2** : reprise après la pause

La tâche Part 2 est mise "en attente" sur l'employé et sera traitée en priorité au prochain tour.

---

## Complexité

- **Temporelle** : O(T × E × log E) où T = nombre de tâches, E = nombre d'employés
- **Spatiale** : O(T + E)
- **Tours max** : `(T+1) × (E+1) × 10 + 200` pour éviter les boucles infinies

Pour des cas typiques (≤50 charrettes, ≤15 employés), l'exécution est **quasi-instantanée** (< 5ms).

---

## Cas limites gérés

| Cas | Comportement |
|-----|-------------|
| Aucun employé qualifié pour une tâche | Tâche non assignée + message d'erreur |
| Employé avec créneau de 0 min | Ignoré (marqué dispo à 99h) |
| Tâche plus longue que la journée entière | Découpage maximal, résidu non assigné |
| Trop de tâches pour les effectifs | Non-assignées listées avec alertes |
| Overlap de pauses manuelles | Blocs fusionnés implicitement |
