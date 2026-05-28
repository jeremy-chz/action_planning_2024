import { useState, useEffect } from "react"
import { fetchMagasins, createMagasin, updateMagasin, deleteMagasin } from "../utils/api"

export default function AdminPage() {
  const [magasins, setMagasins]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [nom, setNom]             = useState("")
  const [loginStr, setLoginStr]   = useState("")
  const [password, setPassword]   = useState("")
  const [saving, setSaving]       = useState(false)
  const [editId, setEditId]       = useState(null)
  const [editNom, setEditNom]     = useState("")
  const [editPwd, setEditPwd]     = useState("")

  const load = async () => {
    try { setMagasins(await fetchMagasins()) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!nom.trim() || !loginStr.trim() || !password.trim()) return
    setSaving(true)
    try {
      await createMagasin(loginStr.trim(), password, nom.trim())
      setNom(""); setLoginStr(""); setPassword("")
      await load()
    } catch (e) { alert(e.message) }
    setSaving(false)
  }

  const handleUpdate = async (id) => {
    try {
      await updateMagasin(id, { nom: editNom, password: editPwd || undefined })
      setEditId(null)
      await load()
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async (id, nom) => {
    if (!confirm(`Supprimer le magasin "${nom}" ?`)) return
    try { await deleteMagasin(id); await load() }
    catch (e) { alert(e.message) }
  }

  return (
    <div>
      <div className="section-header" style={{ marginTop: 32 }}>
        <h1 className="section-title">Administration</h1>
        <p className="section-sub">Gérez les accès des magasins</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
        <div className="card">
          <div className="card-title">Créer un magasin</div>
          <div className="field">
            <label className="input-label">Nom affiché *</label>
            <input className="input" placeholder="Ex: Action Voiron" value={nom} onChange={e => setNom(e.target.value)} />
          </div>
          <div className="field">
            <label className="input-label">Identifiant de connexion *</label>
            <input className="input" placeholder="Ex: action-voiron" value={loginStr}
              onChange={e => setLoginStr(e.target.value)} autoCapitalize="none" />
          </div>
          <div className="field">
            <label className="input-label">Mot de passe *</label>
            <input className="input" type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-full" onClick={handleCreate}
            disabled={saving || !nom.trim() || !loginStr.trim() || !password.trim()}>
            {saving ? <span className="spinner" /> : "＋ Créer le magasin"}
          </button>
        </div>

        <div className="card">
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Magasins actifs</span>
            <span style={{ color: "var(--text2)", fontWeight: 400 }}>{magasins.filter(m => !m.is_admin).length} magasin(s)</span>
          </div>
          {loading ? <div style={{ textAlign: "center", padding: 40 }}><span className="spinner" /></div> : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {magasins.filter(m => !m.is_admin).map(m => (
                <li key={m.id} style={{
                  padding: "10px 14px", background: "var(--bg3)",
                  border: "1px solid var(--border)", borderRadius: 8,
                }}>
                  {editId === m.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input className="input" style={{ flex: 1, minWidth: 120 }} value={editNom}
                        onChange={e => setEditNom(e.target.value)} placeholder="Nom" />
                      <input className="input" type="password" style={{ flex: 1, minWidth: 120 }}
                        value={editPwd} onChange={e => setEditPwd(e.target.value)} placeholder="Nouveau mdp (optionnel)" />
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(m.id)}>✓</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{m.nom}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "DM Mono, monospace" }}>{m.login}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => { setEditId(m.id); setEditNom(m.nom); setEditPwd("") }}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id, m.nom)}>🗑</button>
                      </div>
                    </div>
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