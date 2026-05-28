import { useState } from "react"

function arrondirHeure(h) {
  const minutes = Math.round(h * 60)
  const arr = Math.round(minutes / 5) * 5
  const hh = Math.floor(arr / 60)
  const mm = arr % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

function EmployeCard({ nom, taches, stats }) {
  const workTaches = taches.filter(t => t.type.includes("WORK"))
  const totalMin   = workTaches.reduce((s, t) => s + t.tache_duree, 0)
  const [open, setOpen] = useState(true)

  return (
    <div className="employe-card">
      <div className="employe-header" onClick={() => setOpen(o => !o)} style={{ cursor: "pointer" }}>
        <div>
          <div className="employe-name">{nom}</div>
          <div className="employe-stats">
          {workTaches.length} tâches · {totalMin.toFixed(0)} min de travail
          {stats?.par_employe?.[nom]?.delta_arrondi !== undefined && (
            <span style={{
              marginLeft: 8,
              color: stats.par_employe[nom].delta_arrondi >= 0 ? "var(--green)" : "var(--red-light)",
              fontSize: 11,
            }}>
              {stats.par_employe[nom].delta_arrondi >= 0 ? "+" : ""}{stats.par_employe[nom].delta_arrondi} min arrondi
            </span>
          )}
        </div>
        </div>
        <span style={{ color: "var(--text3)", fontSize: 18 }}>{open ? "▼" : "▶"}</span>
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
              const isPause = t.type.includes("PAUSE")
              const isPartial = t.type.includes("Part")
              return (
                <tr key={i} className={isPause ? "row-pause" : isPartial ? "row-partial" : ""}>
                  <td>
                    <span className="barcode-mono">{t.barcode}</span>
                  </td>
                  <td>{Math.round(t.tache_duree)} min</td>
                  <td>
                    <span className="time-mono">{arrondirHeure(t.debut)} – {arrondirHeure(t.fin)}</span>
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

  // Grouper par employé
  const parEmploye = {}
  for (const entry of planning) {
    if (!parEmploye[entry.employe_nom]) parEmploye[entry.employe_nom] = []
    parEmploye[entry.employe_nom].push(entry)
  }

  const exportCSV = () => {
    const headers = ["Employé", "Code", "Type", "Durée (min)", "Début", "Fin"]
    const rows = planning.map(t => [
      t.employe_nom, t.barcode, t.type,
      Math.round(t.tache_duree), t.debut_str, t.fin_str
    ])
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = `planning_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  return (
    <div>
      <div className="section-header" style={{ marginTop: 32, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 className="section-title">Planning Généré</h1>
          <p className="section-sub">{new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ Export CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Nouveau planning</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className={`stat-value stat-green`}>{stats.taux_assignation ?? 0}%</div>
          <div className="stat-label">Taux d'assignation</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-blue">{stats.total_charrettes ?? 0}</div>
          <div className="stat-label">Charrettes totales</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-cyan">{stats.total_minutes ?? 0}</div>
          <div className="stat-label">Minutes à couvrir</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${stats.score_equilibrage >= 80 ? "stat-green" : "stat-yellow"}`}>
            {stats.score_equilibrage ?? 0}%
          </div>
          <div className="stat-label">Score équilibrage</div>
        </div>
      </div>

      {/* Avertissements */}
      {avertissements.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 16, flexDirection: "column", gap: 6 }}>
          <strong>Avertissements ({avertissements.length})</strong>
          {avertissements.map((a, i) => <div key={i} style={{ fontSize: 12 }}>• {a}</div>)}
        </div>
      )}

      {/* Non assignées */}
      {non_assignees.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 16, flexDirection: "column", gap: 6 }}>
          <strong>{non_assignees.length} charrette(s) non assignée(s)</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {non_assignees.map(b => (
              <span key={b} className="badge badge-pause" style={{ fontSize: 12 }}>{b}</span>
            ))}
          </div>
        </div>
      )}

      {/* Charge par employé */}
      {stats.par_employe && Object.keys(stats.par_employe).length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Répartition de la charge</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(stats.par_employe).map(([nom, s]) => {
              const maxMin = Math.max(...Object.values(stats.par_employe).map(x => x.minutes), 1)
              const pct = (s.minutes / maxMin) * 100
              return (
                <div key={nom}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{nom}</span>
                    <span style={{ color: "var(--text2)", fontFamily: "DM Mono, monospace" }}>
                      {Math.round(s.minutes)} min · {s.taches} tâche{s.taches > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg3)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--blue)", borderRadius: 3, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Planning par employé */}
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
