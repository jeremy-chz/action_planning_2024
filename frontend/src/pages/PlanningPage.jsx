import { useState, useEffect } from "react"
import { fetchPersonnel, genererPlanning } from "../utils/api"
import CharretteInput from "../components/planning/CharretteInput"
import EmployeModal from "../components/planning/EmployeModal"

export default function PlanningPage({ onResultats }) {
  const [charrettes, setCharrettes] = useState([])
  const [personnel, setPersonnel] = useState([])
  const [presents, setPresents] = useState([]) // { id, nom, config }
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [modalEmploye, setModalEmploye] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchPersonnel()
      .then(data => setPersonnel(data))
      .catch(() => setPersonnel([]))
      .finally(() => setLoading(false))
  }, [])

  const presentIds = new Set(presents.map(p => p.id))
  const disponibles = personnel.filter(e => !presentIds.has(e.id))

  const openModal = (emp) => setModalEmploye(emp)

  const validerConfig = (config) => {
    setPresents(ps => [...ps, { id: modalEmploye.id, nom: modalEmploye.nom, config }])
    setModalEmploye(null)
  }

  const retirerPresent = (id) => {
    setPresents(ps => ps.filter(p => p.id !== id))
  }

  const handleGenerer = async () => {
    setError("")
    if (charrettes.length === 0) { setError("Ajoutez au moins une charrette."); return }
    if (presents.length === 0) { setError("Sélectionnez au moins un employé présent."); return }

    setGenerating(true)
    try {
      const payload = {
        charrettes: charrettes.map(c => ({
          barcode: c.barcode,
          duration_min: c.duration_min,
          priorite: c.priorite,
          not_before: c.not_before || null,
          competences_requises: c.competences_requises || [],
        })),
        employes_presents: presents.map(p => p.config),
      }
      console.log("Payload envoyé:", JSON.stringify(payload, null, 2))
      const result = await genererPlanning(payload)
      onResultats(result)
    } catch (e) {
      setError(e.message)
    }
    setGenerating(false)
  }

  return (
    <div>
      <div className="section-header" style={{ marginTop: 32 }}>
        <h1 className="section-title">Générer un Planning</h1>
      </div>

      {/* Charrettes */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Charrettes à décharger</div>
        <CharretteInput charrettes={charrettes} onChange={setCharrettes} />
      </div>

      {/* Employés */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Sélection des employés présents</div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 24 }}><span className="spinner" /></div>
        ) : (
          <div className="pools">
            <div className="pool">
              <div className="pool-title">
                Personnel disponible
                <span className="pool-count">{disponibles.length}</span>
              </div>
              {disponibles.length === 0 ? (
                <p className="pool-empty">
                  {personnel.length === 0
                    ? "Aucun employé. Ajoutez-en dans \"Personnel\"."
                    : "Tous les employés sont déjà sélectionnés."}
                </p>
              ) : (
                <div className="pool-tags">
                  {disponibles.map(emp => (
                    <div key={emp.id} className="tag" onClick={() => openModal(emp)}>
                      {emp.nom}
                      {emp.poste && <span style={{ fontSize: 10, color: "var(--text3)" }}> · {emp.poste}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pool">
              <div className="pool-title">
                Présents & configurés
                <span className="pool-count">{presents.length}</span>
              </div>
              {presents.length === 0 ? (
                <p className="pool-empty">Cliquez sur un employé pour le configurer et l'ajouter</p>
              ) : (
                <div className="pool-tags">
                  {presents.map(p => (
                    <div key={p.id} className="tag selected">
                      {p.nom}
                      <span className="tag-remove" onClick={() => retirerPresent(p.id)}>✕</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

      <button
        className="btn btn-primary btn-full"
        style={{ fontSize: 16, padding: "14px 24px", borderRadius: 10 }}
        onClick={handleGenerer}
        disabled={generating}
      >
        {generating ? <><span className="spinner" /> Génération en cours…</> : "Générer le Planning"}
      </button>

      {modalEmploye && (
        <EmployeModal
          employe={modalEmploye}
          onValider={validerConfig}
          onClose={() => setModalEmploye(null)}
        />
      )}
    </div>
  )
}
