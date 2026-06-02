import { useState } from "react"

function arrondirHeure(h) {
  const minutes = Math.round(h * 60)
  const arr = Math.ceil(minutes / 5) * 5
  const hh  = Math.floor(arr / 60)
  const mm  = arr % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

// ── ZPL ──────────────────────────────────────────────────────────────────────
// Étiquette 50mm x 38mm, ZD410 203dpi
// 50mm = 400 dots, 38mm = 304 dots

function genererEtiquetteZPL(employe, barcode, heureDebut, heureFin, dureeMin, marqueur) {
  const nom    = employe.substring(0, 18).toUpperCase()
  const code   = barcode.substring(0, 20)
  const horaire = `${heureDebut}  ${heureFin}`
  const duree  = `${Math.round(dureeMin)} MIN`
  const marqueurLine = marqueur ? `^FO20,240^A0N,22,22^FD${marqueur}^FS` : ""

  return [
    "^XA",
    "^PW400",        // largeur 400 dots = 50mm
    "^LL304",        // hauteur 304 dots = 38mm
    "^CI28",         // UTF-8
    // Nom employé — grande police
    "^FO20,20^A0N,36,36^FD" + nom + "^FS",
    // Ligne séparatrice
    "^FO20,62^GB360,2,2^FS",
    // Code charrette — monospace bien lisible
    "^FO20,74^A0N,42,42^FD" + code + "^FS",
    // Ligne séparatrice
    "^FO20,124^GB360,2,2^FS",
    // Horaire début → fin
    "^FO20,136^A0N,34,34^FD" + horaire + "^FS",
    // Durée
    "^FO20,178^A0N,26,26^FD" + duree + "^FS",
    // Marqueur pause/fin (si présent)
    marqueurLine,
    "^XZ",
  ].join("\n")
}

function construireEtiquettes(planning) {
  // Grouper par employé, trier par heure de début
  const parEmploye = {}
  for (const t of planning) {
    if (!parEmploye[t.employe_nom]) parEmploye[t.employe_nom] = []
    parEmploye[t.employe_nom].push(t)
  }

  const etiquettes = []

  for (const [nom, taches] of Object.entries(parEmploye)) {
    // Trier par heure de début
    const triees = [...taches].sort((a, b) => a.debut - b.debut)

    // Regrouper Part 1 + Part 2 du même barcode de base
    const groupes = []
    let i = 0
    while (i < triees.length) {
      const t = triees[i]
      if (t.type.includes("Part 1")) {
        // Chercher le Part 2 correspondant
        const codeBase = t.barcode.replace(" (Part 1)", "")
        const j = triees.findIndex((t2, idx) =>
          idx > i && t2.barcode === codeBase + " (Part 2)"
        )
        if (j !== -1) {
          groupes.push({ type: "split", part1: t, part2: triees[j], codeBase })
          // Marquer le Part 2 comme traité
          triees.splice(j, 1)
        } else {
          groupes.push({ type: "single", tache: t })
        }
      } else if (!t.type.includes("Part 2")) {
        groupes.push({ type: t.type.includes("PAUSE") ? "pause" : "single", tache: t })
      }
      i++
    }

    // Générer les étiquettes, en déterminant le marqueur
    for (let gi = 0; gi < groupes.length; gi++) {
      const groupe = groupes[gi]

      // Trouver ce qui suit pour déterminer le marqueur
      let marqueur = null
      const suivant = groupes[gi + 1]
      if (!suivant) {
        marqueur = "> FIN"
      } else if (suivant.type === "pause") {
        marqueur = "> PAUSE"
      }

      if (groupe.type === "split") {
        const { part1, part2, codeBase } = groupe
        const debut  = arrondirHeure(part1.debut)
        const milieu = arrondirHeure(part1.fin)
        const fin    = arrondirHeure(part2.fin)
        const duree  = part1.tache_duree + part2.tache_duree
        // Horaire sur deux lignes : on compacte en "07:00-09:00/09:30-10:15"
        etiquettes.push(genererEtiquetteZPL(
          nom,
          codeBase,
          `${debut}-${milieu}`,
          `${milieu}-${fin}`,  // sera affiché côte à côte
          duree,
          marqueur
        ))
      } else if (groupe.type === "single" && groupe.tache.type.includes("WORK")) {
        const t = groupe.tache
        etiquettes.push(genererEtiquetteZPL(
          nom,
          t.barcode,
          arrondirHeure(t.debut),
          arrondirHeure(t.fin),
          t.tache_duree,
          marqueur
        ))
      }
      // Les pauses sont ignorées (pas d'étiquette)
    }
  }

  return etiquettes
}

function imprimerEtiquettes(planning) {
  const etiquettes = construireEtiquettes(planning)
  if (etiquettes.length === 0) return

  const zplComplet = etiquettes.join("\n")
  const encoded    = encodeURIComponent(zplComplet)
  window.location.href = `zutils://print?zpl=${encoded}`
}

// ── Composants ────────────────────────────────────────────────────────────────

function EmployeCard({ nom, taches, stats }) {
  const workTaches = taches.filter(t => t.type.includes("WORK"))
  const totalMin   = workTaches.reduce((s, t) => s + t.tache_duree, 0)
  const [open, setOpen] = useState(true)

  const delta = stats?.par_employe?.[nom]?.delta_arrondi

  return (
    <div className="employe-card">
      <div
        className="employe-header"
        onClick={() => setOpen(o => !o)}
        style={{ cursor: "pointer" }}
      >
        <div>
          <div className="employe-name">{nom}</div>
          <div className="employe-stats">
            {workTaches.length} tâche{workTaches.length > 1 ? "s" : ""} &nbsp;·&nbsp; {totalMin.toFixed(0)} min
            {delta !== undefined && delta !== 0 && (
              <span style={{
                marginLeft: 8,
                color: delta >= 0 ? "var(--yellow)" : "var(--green)",
              }}>
                {delta >= 0 ? "+" : ""}{delta} min
              </span>
            )}
          </div>
        </div>
        <span style={{ color: "var(--text3)", fontSize: 14 }}>{open ? "-" : "+"}</span>
      </div>

      {open && (
        <table className="task-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Durée</th>
              <th>Horaire</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {taches.map((t, i) => {
              const isPause   = t.type.includes("PAUSE")
              const isPartial = t.type.includes("Part")
              return (
                <tr key={i} className={isPause ? "row-pause" : isPartial ? "row-partial" : ""}>
                  <td><span className="barcode-mono">{t.barcode}</span></td>
                  <td>{Math.round(t.tache_duree)} min</td>
                  <td>
                    <span className="time-mono">
                      {arrondirHeure(t.debut)} – {arrondirHeure(t.fin)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${isPause ? "badge-pause" : isPartial ? "badge-partial" : "badge-work"}`}>
                      {t.type}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function ResultatsPage({ data, onBack }) {
  const { planning = [], non_assignees = [], stats = {}, avertissements = [] } = data

  const parEmploye = {}
  for (const entry of planning) {
    if (!parEmploye[entry.employe_nom]) parEmploye[entry.employe_nom] = []
    parEmploye[entry.employe_nom].push(entry)
  }

  const exportCSV = () => {
    const headers = ["Employé", "Code", "Type", "Durée (min)", "Début", "Fin"]
    const rows    = planning.map(t => [
      t.employe_nom, t.barcode, t.type,
      Math.round(t.tache_duree), t.debut_str, t.fin_str,
    ])
    const bom = "﻿"
    const csv = bom + [headers, ...rows].map(r => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url
    a.download = `planning_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const nbEtiquettes = construireEtiquettes(planning).length

  return (
    <div>
      <div className="section-header" style={{
        marginTop: 8, display: "flex",
        alignItems: "flex-end", justifyContent: "space-between",
      }}>
        <div>
          <h1 className="section-title">Planning généré</h1>
          <p className="section-sub">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>Export CSV</button>
          {nbEtiquettes > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => imprimerEtiquettes(planning)}>
              Imprimer étiquettes ({nbEtiquettes})
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onBack}>Nouveau planning</button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className={`stat-value ${stats.taux_assignation >= 95 ? "stat-green" : "stat-yellow"}`}>
            {stats.taux_assignation ?? 0}%
          </div>
          <div className="stat-label">Assignation</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.total_charrettes ?? 0}</div>
          <div className="stat-label">Charrettes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-cyan">{stats.total_minutes ?? 0}</div>
          <div className="stat-label">Minutes totales</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${stats.score_equilibrage >= 80 ? "stat-green" : "stat-yellow"}`}>
            {stats.score_equilibrage ?? 0}%
          </div>
          <div className="stat-label">Equilibrage</div>
        </div>
      </div>

      {avertissements.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 14, flexDirection: "column", gap: 4 }}>
          <strong>Avertissements ({avertissements.length})</strong>
          {avertissements.map((a, i) => (
            <div key={i} style={{ fontSize: 12 }}>{a}</div>
          ))}
        </div>
      )}

      {non_assignees.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 14, flexDirection: "column", gap: 6 }}>
          <strong>{non_assignees.length} charrette{non_assignees.length > 1 ? "s" : ""} non assignée{non_assignees.length > 1 ? "s" : ""}</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {non_assignees.map(b => (
              <span key={b} className="badge badge-pause">{b}</span>
            ))}
          </div>
        </div>
      )}

      {stats.par_employe && Object.keys(stats.par_employe).length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Répartition</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(stats.par_employe).map(([nom, s]) => (
              <div key={nom} style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 12, padding: "4px 0",
              }}>
                <span style={{ fontWeight: 500 }}>{nom}</span>
                <span style={{ color: "var(--text2)", fontFamily: "IBM Plex Mono, monospace" }}>
                  {Math.round(s.minutes)} min &nbsp;·&nbsp; {s.taches} tâche{s.taches > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="planning-grid">
        {Object.entries(parEmploye).map(([nom, taches]) => (
          <EmployeCard key={nom} nom={nom} taches={taches} stats={data.stats} />
        ))}
      </div>

      {planning.length === 0 && (
        <div className="empty-state">Aucune assignation générée.</div>
      )}
    </div>
  )
}
