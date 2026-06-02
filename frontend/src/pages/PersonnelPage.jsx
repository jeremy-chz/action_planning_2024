import { useState, useEffect } from "react"
import { fetchPersonnel, addPersonnel, updatePersonnel, deletePersonnel } from "../utils/api"

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState([])
  const [loading, setLoading]     = useState(true)
  const [nom, setNom]             = useState("")
  const [contrat, setContrat]     = useState("")
  const [saving, setSaving]       = useState(false)
  const [editId, setEditId]       = useState(null)
  const [editNom, setEditNom]     = useState("")
  const [editContrat, setEditContrat] = useState("")

  const load = async () => {
    try {
      setPersonnel(await fetchPersonnel())
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!nom.trim()) return
    if (!contrat) { alert("Sélectionne un contrat (30h ou 35h)"); return }
    setSaving(true)
    try {
      await addPersonnel(nom.trim(), "", contrat)
      setNom(""); setContrat("")
      await load()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Supprimer ${name} ?`)) return
    try { await deletePersonnel(id); await load() }
    catch (e) { alert(e.message) }
  }

  const startEdit = (emp) => {
    setEditId(emp.id); setEditNom(emp.nom); setEditContrat(emp.contrat || "")
  }

  const handleUpdate = async () => {
    if (!editNom.trim()) return
    if (!editContrat) { alert("Sélectionne un contrat (30h ou 35h)"); return }
    try {
      await updatePersonnel(editId, editNom.trim(), "", editContrat)
      setEditId(null)
      await load()
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      <div className="section-header" style={{ marginTop: 8 }}>
        <h1 className="section-title">Personnel</h1>
        <p className="section-sub">Gérez la liste des employés</p>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div className="card">
          <div className="card-title">Ajouter un employé</div>
          <div className="field">
            <label className="input-label">Nom</label>
            <input
              className="input"
              value={nom}
              onChange={e => setNom(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="field">
            <label className="input-label">Contrat</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["30h", "35h"].map(c => (
                <div
                  key={c}
                  className={`chip ${contrat === c ? "active" : ""}`}
                  onClick={() => setContrat(c)}
                  style={{ flex: 1, justifyContent: "center", padding: "8px" }}
                >
                  {c}
                </div>
              ))}
            </div>
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={handleAdd}
            disabled={saving || !nom.trim()}
          >
            {saving ? <span className="spinner" /> : "Ajouter"}
          </button>
        </div>

        <div className="card">
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Personnel</span>
            <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--text3)", fontSize: 11 }}>
              {personnel.length} personne{personnel.length > 1 ? "s" : ""}
            </span>
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 32 }}><span className="spinner" /></div>
          ) : personnel.length === 0 ? (
            <p className="pool-empty">Aucun employé enregistré.</p>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 1 }}>
              {personnel.map((emp, idx) => (
                <li key={emp.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: idx < personnel.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  {editId === emp.id ? (
                    <div style={{ display: "flex", gap: 8, flex: 1, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        className="input"
                        style={{ flex: 1, minWidth: 120 }}
                        value={editNom}
                        onChange={e => setEditNom(e.target.value)}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        {["30h", "35h"].map(c => (
                          <div
                            key={c}
                            className={`chip ${editContrat === c ? "active" : ""}`}
                            onClick={() => setEditContrat(c)}
                            style={{ padding: "5px 12px" }}
                          >
                            {c}
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={handleUpdate}>Valider</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Annuler</button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{emp.nom}</div>
                        {emp.contrat && (
                          <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "IBM Plex Mono, monospace", marginTop: 2 }}>
                            {emp.contrat}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(emp)}>Modifier</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id, emp.nom)}>Supprimer</button>
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
