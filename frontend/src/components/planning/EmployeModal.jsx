import { useState } from "react"

const COMPETENCES_DISPONIBLES = ["lourd", "fragile"]

export default function EmployeModal({ employe, onValider, onClose }) {
  const [creneaux, setCreneaux] = useState([{ debut: "07:00", fin: "15:00" }])
  const [pauses, setPauses] = useState([])
  const [competences, setCompetences] = useState([])
  const [chargeMax, setChargeMax] = useState(480)

  const addCreneau = () => setCreneaux(c => [...c, { debut: "07:00", fin: "15:00" }])
  const removeCreneau = i => setCreneaux(c => c.filter((_, j) => j !== i))
  const updateCreneau = (i, field, val) => setCreneaux(c => c.map((cr, j) => j === i ? { ...cr, [field]: val } : cr))

  const addPause = () => setPauses(p => [...p, { debut: "10:00", duree: "15" }])
  const removePause = i => setPauses(p => p.filter((_, j) => j !== i))
  const updatePause = (i, field, val) => setPauses(p => p.map((pa, j) => j === i ? { ...pa, [field]: val } : pa))

  const toggleComp = c => setCompetences(cs => cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c])

  const valider = () => {
    if (creneaux.length === 0) { alert("Ajoutez au moins un créneau de travail."); return }
    const config = {
      nom: employe.nom,
      creneaux: creneaux.map(c => [c.debut, c.fin]),
      pauses: pauses.map(p => [p.debut, p.duree]),
      competences,
      charge_max_min: chargeMax,
    }
    onValider(config)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Configurer : {employe.nom}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* Créneaux */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="input-label" style={{ margin: 0 }}>🕐 Créneaux de travail</span>
              <button className="btn btn-ghost btn-sm" onClick={addCreneau}>＋ Créneau</button>
            </div>
            {creneaux.map((cr, i) => (
              <div key={i} className="row" style={{ marginBottom: 8 }}>
                <div className="field" style={{ flex: "0 0 auto" }}>
                  <label className="input-label">De</label>
                  <input type="time" className="input" style={{ width: 130 }} value={cr.debut}
                    onChange={e => updateCreneau(i, "debut", e.target.value)} />
                </div>
                <div className="field" style={{ flex: "0 0 auto" }}>
                  <label className="input-label">À</label>
                  <input type="time" className="input" style={{ width: 130 }} value={cr.fin}
                    onChange={e => updateCreneau(i, "fin", e.target.value)} />
                </div>
                {creneaux.length > 1 && (
                  <button className="btn btn-danger btn-sm" style={{ marginTop: 22 }}
                    onClick={() => removeCreneau(i)}>✕</button>
                )}
              </div>
            ))}
            <div className="alert alert-info" style={{ marginTop: 8, fontSize: 12 }}>
              La coupure 8h–9h sera ajoutée automatiquement si le créneau la chevauche.
            </div>
          </div>

          <hr className="divider" />

          {/* Pauses manuelles */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="input-label" style={{ margin: 0 }}>Pauses manuelles</span>
              <button className="btn btn-ghost btn-sm" onClick={addPause}>＋ Pause</button>
            </div>
            {pauses.length === 0 && <p className="pool-empty">Aucune pause manuelle</p>}
            {pauses.map((pa, i) => (
              <div key={i} className="row" style={{ marginBottom: 8 }}>
                <div className="field" style={{ flex: "0 0 auto" }}>
                  <label className="input-label">Début</label>
                  <input type="time" className="input" style={{ width: 130 }} value={pa.debut}
                    onChange={e => updatePause(i, "debut", e.target.value)} />
                </div>
                <div className="field" style={{ flex: "0 0 auto" }}>
                  <label className="input-label">Durée</label>
                  <select className="input" style={{ width: 110 }} value={pa.duree}
                    onChange={e => updatePause(i, "duree", e.target.value)}>
                    <option value="10">10 min</option>
                    <option value="15">15 min</option>
                    <option value="20">20 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                  </select>
                </div>
                <button className="btn btn-danger btn-sm" style={{ marginTop: 22 }}
                  onClick={() => removePause(i)}>✕</button>
              </div>
            ))}
          </div>

          <hr className="divider" />

          {/* Compétences */}
          <div style={{ marginBottom: 20 }}>
            <label className="input-label">Compétences</label>
            <div className="chips">
              {COMPETENCES_DISPONIBLES.map(c => (
                <div key={c} className={`chip ${competences.includes(c) ? "active" : ""}`}
                  onClick={() => toggleComp(c)}>
                  {c}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
              Les tâches marquées avec une compétence requise ne seront assignées qu'aux employés qualifiés.
            </p>
          </div>

          <hr className="divider" />

          {/* Charge max */}
          <div>
            <label className="input-label">Charge max journalière : <strong style={{ color: "var(--text)" }}>{chargeMax} min ({(chargeMax/60).toFixed(1)}h)</strong></label>
            <input type="range" min={60} max={600} step={30} value={chargeMax}
              onChange={e => setChargeMax(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--blue)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)" }}>
              <span>1h</span><span>5h</span><span>10h</span>
            </div>
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={valider}>✓ Valider et ajouter</button>
        </div>
      </div>
    </div>
  )
}
