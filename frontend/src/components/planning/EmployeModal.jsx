import { useState } from "react"
import { updateTemplate } from "../../utils/api"


export default function EmployeModal({ employe, onValider, onClose }) {
  const template = employe // employe contient déjà contrat, matin_debut, etc.

  const contrat = template.contrat || ""
  const [typeJournee, setTypeJournee]   = useState("")
  const [debut, setDebut]               = useState("")
  const [fin, setFin]                   = useState("")
  const [pauses, setPauses]             = useState([])
  const [pausesMode, setPausesMode]     = useState("manuel")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [ordreInverse, setOrdreInverse] = useState(false)

  // Quand on coche matin/aprem → pré-remplir les horaires du template
  const handleTypeJournee = (type) => {
    setTypeJournee(type)
    if (type === "matin") {
      setDebut(template.matin_debut || "")
      setFin(template.matin_fin || "")
    } else {
      setDebut(template.aprem_debut || "")
      setFin(template.aprem_fin || "")
    }
  }

  const addPause = () => setPauses(p => [...p, { debut: "10:00", duree: "15" }])
  const removePause = i => setPauses(p => p.filter((_, j) => j !== i))
  const updatePause = (i, field, val) => setPauses(p => p.map((pa, j) => j === i ? { ...pa, [field]: val } : pa))

  const handleSaveTemplate = async () => {
    setSavingTemplate(true)
    try {
      const data = {
        nom:    employe.nom,
        poste:  employe.poste,
        contrat,
        matin_debut: typeJournee === "matin" ? debut : template.matin_debut,
        matin_fin:   typeJournee === "matin" ? fin   : template.matin_fin,
        aprem_debut: typeJournee === "aprem" ? debut : template.aprem_debut,
        aprem_fin:   typeJournee === "aprem" ? fin   : template.aprem_fin,
      }
      await updateTemplate(employe.id, data)
      alert("Template sauvegardé !")
    } catch (e) {
      alert(e.message)
    }
    setSavingTemplate(false)
  }

  const handleValider = () => {
    if (!contrat)      { alert("Contrat non défini pour cet employé"); return }
    if (!typeJournee)  { alert("Sélectionne matin ou après-midi"); return }
    if (!debut || !fin){ alert("Renseigne les horaires"); return }
    if (debut >= fin)  { alert("L'heure de début doit être avant l'heure de fin"); return }

    const config = {
      nom:          employe.nom,
      contrat,
      type_journee: pausesMode === "auto" ? typeJournee : undefined,
      creneaux:     [[debut, fin]],
      pauses:       pauses.map(p => [p.debut, p.duree]),
      competences: [],
      ordre_inverse: ordreInverse,
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

          {/* Contrat */}
          <div className="field">
            <label className="input-label">Contrat</label>
            <div className="chip active" style={{ justifyContent: "center", padding: "10px", cursor: "default", opacity: 0.8 }}>
              {contrat || "Non défini"}
            </div>
          </div>

          {/* Matin / Après-midi */}
          <div className="field">
            <label className="input-label">Type de journée</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[["matin", "Matin"], ["aprem", "Après-midi"]].map(([val, label]) => (
                <div key={val} className={`chip ${typeJournee === val ? "active" : ""}`}
                  onClick={() => handleTypeJournee(val)}
                  style={{ flex: 1, justifyContent: "center", padding: "10px" }}>
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Horaires */}
          <div className="row">
            <div className="field">
              <label className="input-label">Début</label>
              <input type="time" className="input" value={debut}
                onChange={e => setDebut(e.target.value)} />
            </div>
            <div className="field">
              <label className="input-label">Fin</label>
              <input type="time" className="input" value={fin}
                onChange={e => setFin(e.target.value)} />
            </div>
          </div>

          <hr className="divider" />

          {/* Pauses */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="input-label" style={{ margin: 0 }}>Pauses</span>
              <div style={{ display: "flex", gap: 6 }}>
                {[["auto", "Automatiques"], ["manuel", "Manuelles"]].map(([val, label]) => (
                  <div key={val} className={`chip ${pausesMode === val ? "active" : ""}`}
                    onClick={() => setPausesMode(val)}
                    style={{ padding: "6px 14px", fontSize: 13 }}>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {pausesMode === "auto" && contrat && typeJournee && (
              <div className="alert alert-info" style={{ marginBottom: 10, fontSize: 12 }}>
                Pauses calculées automatiquement — contrat {contrat} {typeJournee === "matin" ? "matin" : "après-midi"}.
              </div>
            )}

            {pausesMode === "manuel" && (
              <>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={addPause}>＋ Ajouter</button>
                </div>
                {pauses.length === 0 && <p className="pool-empty">Aucune pause</p>}
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
                      </select>
                    </div>
                    <button className="btn btn-danger btn-sm" style={{ marginTop: 22 }}
                      onClick={() => removePause(i)}>✕</button>
                  </div>
                ))}
              </>
            )}
          </div>

          <hr className="divider" />

          <div className="field">
            <label className="input-label">Ordre des charrettes</label>
            <div style={{ display: "flex", gap: 10 }}>
              <div className={`chip ${!ordreInverse ? "active" : ""}`}
                onClick={() => setOrdreInverse(false)}
                style={{ flex: 1, justifyContent: "center", padding: "10px" }}>
                rapides en premier
              </div>
              <div className={`chip ${ordreInverse ? "active" : ""}`}
                onClick={() => setOrdreInverse(true)}
                style={{ flex: 1, justifyContent: "center", padding: "10px" }}>
                Longues en premier
              </div>
            </div>
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-ghost" onClick={handleSaveTemplate} disabled={savingTemplate}>
            {savingTemplate ? <span className="spinner" /> : "Sauvegarder template"}
          </button>
          <button className="btn btn-primary" onClick={handleValider}>✓ Valider pour aujourd'hui</button>
        </div>
      </div>
    </div>
  )
}