import { useState, useEffect } from "react"
import { fetchPersonnel, genererPlanning } from "../utils/api"
import CharretteInput from "../components/planning/CharretteInput"
import EmployeModal from "../components/planning/EmployeModal"

export default function PlanningPage({ onResultats }) {
  const [charrettes, setCharrettes] = useState([])
  const [personnel, setPersonnel]   = useState([])
  const [presents, setPresents]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)
  const [modalEmploye, setModalEmploye] = useState(null)
  const [error, setError]           = useState("")

  const reloadPersonnel = () =>
    fetchPersonnel()
      .then(data => {
        setPersonnel(data)
        // Mettre à jour modalEmploye avec les nouvelles données s'il est ouvert
        setModalEmploye(prev => prev ? (data.find(e => e.id === prev.id) ?? prev) : null)
      })
      .catch(() => {})

  useEffect(() => {
    fetchPersonnel()
      .then(data => setPersonnel(data))
      .catch(() => setPersonnel([]))
      .finally(() => setLoading(false))
  }, [])

  const presentIds  = new Set(presents.map(p => p.id))
  const disponibles = personnel
    .filter(e => !presentIds.has(e.id))
    .sort((a, b) => {
      const contratOrder = { "35h": 0, "30h": 1 }
      const ca = contratOrder[a.contrat] ?? 2
      const cb = contratOrder[b.contrat] ?? 2
      if (ca !== cb) return ca - cb
      return a.nom.localeCompare(b.nom, "fr")
    })

  const validerConfig = (config) => {
    setPresents(ps => [...ps, { id: modalEmploye.id, nom: modalEmploye.nom, config }])
    setModalEmploye(null)
  }

  const retirerPresent = (id) => setPresents(ps => ps.filter(p => p.id !== id))

  const handleGenerer = async () => {
    setError("")
    if (charrettes.length === 0) { setError("Ajoutez au moins une charrette."); return }
    if (presents.length === 0)   { setError("Sélectionnez au moins un employé."); return }

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
      const result = await genererPlanning(payload)
      onResultats(result)
    } catch (e) {
      setError(e.message)
    }
    setGenerating(false)
  }

  return (
    <div>
      <div className="section-header" style={{ marginTop: 8 }}>
        <h1 className="section-title">Générer un planning</h1>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Charrettes</div>
        <CharretteInput charrettes={charrettes} onChange={setCharrettes} />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Employés présents</div>
        {loading ? (
          <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
            <span className="spinner" />
          </div>
        ) : (
          <div className="pools">
            <div className="pool">
              <div className="pool-title">
                Disponibles
                <span className="pool-count">{disponibles.length}</span>
              </div>
              {disponibles.length === 0 ? (
                <p className="pool-empty">
                  {personnel.length === 0
                    ? "Aucun employé. Créez-en dans Personnel."
                    : "Tous les employés sont sélectionnés."}
                </p>
              ) : (
                <div className="pool-tags">
                  {disponibles.map(emp => (
                    <div key={emp.id} className="tag" onClick={() => setModalEmploye(emp)}>
                      {emp.nom}
                      {emp.contrat && (
                        <span style={{ fontSize: 10, color: "var(--text3)" }}>{emp.contrat}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pool">
              <div className="pool-title">
                Configurés
                <span className="pool-count">{presents.length}</span>
              </div>
              {presents.length === 0 ? (
                <p className="pool-empty">Cliquez sur un employé pour le configurer</p>
              ) : (
                <div className="pool-tags">
                  {presents.map(p => (
                    <div key={p.id} className="tag selected">
                      {p.nom}
                      <span className="tag-remove" onClick={() => retirerPresent(p.id)}>x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>
      )}

      <button
        className="btn btn-primary btn-full"
        style={{ fontSize: 14, padding: "12px 24px" }}
        onClick={handleGenerer}
        disabled={generating}
      >
        {generating ? <><span className="spinner" /> Génération en cours</> : "Générer le planning"}
      </button>

      {modalEmploye && (
        <EmployeModal
          employe={modalEmploye}
          onValider={validerConfig}
          onTemplateSaved={reloadPersonnel}
          onClose={() => setModalEmploye(null)}
        />
      )}
    </div>
  )
}
