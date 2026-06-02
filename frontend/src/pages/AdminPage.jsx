import { useState, useEffect } from "react"
import { fetchMagasins, createMagasin, updateMagasin, deleteMagasin, fetchLogs } from "../utils/api"

function formatDate(iso) {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
    + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

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

  const [logs, setLogs]           = useState([])
  const [warnings, setWarnings]   = useState([])
  const [logsLoading, setLogsLoading] = useState(true)

  const load = async () => {
    try { setMagasins(await fetchMagasins()) }
    catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  const loadLogs = async () => {
    setLogsLoading(true)
    try {
      const data = await fetchLogs()
      setLogs(data.logs)
      setWarnings(data.warnings)
    } catch (e) { /* silencieux */ }
    finally { setLogsLoading(false) }
  }

  useEffect(() => { load(); loadLogs() }, [])

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

        {/* Warnings multi-IP */}
        {warnings.length > 0 && (
          <div className="alert alert-warning" style={{ flexDirection: "column", gap: 4 }}>
            <strong style={{ fontSize: 12 }}>Connexions suspectes</strong>
            {warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12 }}>{w}</div>
            ))}
          </div>
        )}

        {/* Créer un magasin */}
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

        {/* Liste magasins */}
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

        {/* Logs de connexion */}
        <div className="card">
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Logs de connexion</span>
            <button className="btn btn-ghost btn-sm" onClick={loadLogs} style={{ textTransform: "none", letterSpacing: 0 }}>
              Actualiser
            </button>
          </div>
          {logsLoading ? (
            <div style={{ textAlign: "center", padding: 24 }}><span className="spinner" /></div>
          ) : logs.length === 0 ? (
            <p className="pool-empty">Aucun log enregistré.</p>
          ) : (
            <table className="task-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Magasin</th>
                  <th>IP</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td>
                      <span className="time-mono">{formatDate(l.date)}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 12 }}>{l.magasin_nom || l.magasin_login}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "IBM Plex Mono, monospace" }}>
                        {l.magasin_login}
                      </div>
                    </td>
                    <td>
                      <span className="barcode-mono" style={{ fontSize: 11 }}>{l.ip}</span>
                    </td>
                    <td>
                      <span className={`badge ${l.succes ? "badge-work" : "badge-pause"}`}>
                        {l.succes ? "OK" : "Echec"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}
