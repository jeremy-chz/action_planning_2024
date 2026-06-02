import { useState, useEffect } from "react"
import { fetchMagasins, createMagasin, updateMagasin, deleteMagasin } from "../utils/api"

export default function AdminPage() {
  const [magasins, setMagasins] = useState([])
  const [loading, setLoading]   = useState(true)
  const [nom, setNom]           = useState("")
  const [loginStr, setLoginStr] = useState("")
  const [password, setPassword] = useState("")
  const [saving, setSaving]     = useState(false)
  const [editId, setEditId]     = useState(null)
  const [editNom, setEditNom]   = useState("")
  const [editPwd, setEditPwd]   = useState("")

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

  const handleDelete = async (id, name) => {
    if (!confirm(`Supprimer le magasin "${name}" ?`)) return
    try { await deleteMagasin(id); await load() }
    catch (e) { alert(e.message) }
  }

  return (
    <div>
      <div className="section-header" style={{ marginTop: 8 }}>
        <h1 className="section-title">Administration</h1>
        <p className="section-sub">Gestion des accès magasins</p>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div className="card">
          <div className="card-title">Créer un magasin</div>
          <div className="field">
            <label className="input-label">Nom affiché</label>
            <input className="input" value={nom} onChange={e => setNom(e.target.value)} />
          </div>
          <div className="field">
            <label className="input-label">Identifiant de connexion</label>
            <input className="input" value={loginStr}
              onChange={e => setLoginStr(e.target.value)} autoCapitalize="none" />
          </div>
          <div className="field">
            <label className="input-label">Mot de passe</label>
            <input className="input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} />
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={handleCreate}
            disabled={saving || !nom.trim() || !loginStr.trim() || !password.trim()}
          >
            {saving ? <span className="spinner" /> : "Créer le magasin"}
          </button>
        </div>

        <div className="card">
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Magasins actifs</span>
            <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, fontSize: 11, color: "var(--text3)" }}>
              {magasins.filter(m => !m.is_admin).length} magasin(s)
            </span>
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 32 }}><span className="spinner" /></div>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 1 }}>
              {magasins.filter(m => !m.is_admin).map((m, idx, arr) => (
                <li key={m.id} style={{
                  padding: "10px 0",
                  borderBottom: idx < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  {editId === m.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input className="input" style={{ flex: 1, minWidth: 120 }} value={editNom}
                        onChange={e => setEditNom(e.target.value)} placeholder="Nom" />
                      <input className="input" type="password" style={{ flex: 1, minWidth: 120 }}
                        value={editPwd} onChange={e => setEditPwd(e.target.value)}
                        placeholder="Nouveau mot de passe" />
                      <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(m.id)}>Valider</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Annuler</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{m.nom}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "IBM Plex Mono, monospace", marginTop: 2 }}>
                          {m.login}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-ghost btn-sm"
                          onClick={() => { setEditId(m.id); setEditNom(m.nom); setEditPwd("") }}>
                          Modifier
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m.id, m.nom)}>
                          Supprimer
                        </button>
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
