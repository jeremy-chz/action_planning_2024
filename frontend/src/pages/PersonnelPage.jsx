import { useState, useEffect } from "react"
import { fetchPersonnel, addPersonnel, updatePersonnel, deletePersonnel } from "../utils/api"

const POSTES = ["", "Employé polyvalent", "RM", "RMA", "35h", "30h"]

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState([])
  const [loading, setLoading] = useState(true)
  const [nom, setNom] = useState("")
  const [poste, setPoste] = useState("")
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editNom, setEditNom] = useState("")
  const [editPoste, setEditPoste] = useState("")

  const load = async () => {
    try {
      const data = await fetchPersonnel()
      setPersonnel(data)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!nom.trim()) return
    setSaving(true)
    try {
      await addPersonnel(nom.trim(), poste)
      setNom(""); setPoste("")
      await load()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Supprimer ${name} ?`)) return
    try {
      await deletePersonnel(id)
      await load()
    } catch (e) { alert(e.message) }
  }

  const startEdit = (emp) => {
    setEditId(emp.id); setEditNom(emp.nom); setEditPoste(emp.poste || "")
  }

  const handleUpdate = async () => {
    if (!editNom.trim()) return
    try {
      await updatePersonnel(editId, editNom.trim(), editPoste)
      setEditId(null)
      await load()
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      <div className="section-header" style={{ marginTop: 32 }}>
        <h1 className="section-title">Gestion du Personnel</h1>
        <p className="section-sub">Gérez la liste des employés disponibles pour le planning</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>
        {/* Formulaire ajout */}
        <div className="card">
          <div className="card-title">Ajouter un employé</div>
          <div className="field">
            <label className="input-label">Nom *</label>
            <input
              className="input"
              placeholder="Ex: Nathalie K."
              value={nom}
              onChange={e => setNom(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="field">
            <label className="input-label">Poste</label>
            <select className="input" value={poste} onChange={e => setPoste(e.target.value)}>
              {POSTES.map(p => <option key={p} value={p}>{p || "— sélectionner —"}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-full" onClick={handleAdd} disabled={saving || !nom.trim()}>
            {saving ? <span className="spinner" /> : "＋ Ajouter"}
          </button>
        </div>

        {/* Liste */}
        <div className="card">
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Personnel actuel</span>
            <span style={{ color: "var(--text2)", fontWeight: 400 }}>{personnel.length} personne{personnel.length > 1 ? "s" : ""}</span>
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}><span className="spinner" /></div>
          ) : personnel.length === 0 ? (
            <p className="pool-empty">Aucun employé enregistré.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {personnel.map(emp => (
                <li key={emp.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: "var(--bg3)",
                  border: "1px solid var(--border)", borderRadius: 8,
                }}>
                  {editId === emp.id ? (
                    <div style={{ display: "flex", gap: 8, flex: 1, alignItems: "center" }}>
                      <input className="input" style={{ flex: 1 }} value={editNom} onChange={e => setEditNom(e.target.value)} />
                      <select className="input" style={{ flex: 1 }} value={editPoste} onChange={e => setEditPoste(e.target.value)}>
                        {POSTES.map(p => <option key={p} value={p}>{p || "— poste —"}</option>)}
                      </select>
                      <button className="btn btn-primary btn-sm" onClick={handleUpdate}>✓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.nom}</div>
                        {emp.poste && <div style={{ fontSize: 12, color: "var(--text3)" }}>{emp.poste}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(emp)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id, emp.nom)}>🗑</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
