import { useState, useEffect } from "react"
import PersonnelPage from "./pages/PersonnelPage"
import PlanningPage from "./pages/PlanningPage"
import ResultatsPage from "./pages/ResultatsPage"
import AdminPage from "./pages/AdminPage"
import LoginPage from "./pages/LoginPage"
import { getMagasin, removeToken, fetchMe, setMagasin } from "./utils/api"
import "./index.css"

export default function App() {
  const [page, setPage]             = useState("planning")
  const [planningData, setPlanningData] = useState(null)
  const [magasin, setMagasinState]  = useState(null)
  const [checking, setChecking]     = useState(true)

  useEffect(() => {
    // Vérifier si déjà connecté
    const m = getMagasin()
    if (m) {
      fetchMe()
        .then(me => { setMagasinState(me); setMagasin(me) })
        .catch(() => { removeToken(); setMagasinState(null) })
        .finally(() => setChecking(false))
    } else {
      setChecking(false)
    }
  }, [])

  const handleLogin = (m) => { setMagasinState(m) }

  const handleLogout = () => {
    removeToken()
    setMagasinState(null)
    setPage("planning")
  }

  if (checking) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
      <span className="spinner" />
    </div>
  )

  if (!magasin) return <LoginPage onLogin={handleLogin} />

  return (
    <div className="app-root">
      <Nav page={page} setPage={setPage} magasin={magasin} onLogout={handleLogout} />
      <main className="main-content">
        {page === "planning" && (
          <PlanningPage onResultats={(data) => { setPlanningData(data); setPage("resultats") }} />
        )}
        {page === "personnel" && <PersonnelPage />}
        {page === "resultats" && planningData && (
          <ResultatsPage data={planningData} onBack={() => setPage("planning")} />
        )}
        {page === "resultats" && !planningData && (
          <div className="empty-state">
            <p>Aucun planning généré. <button className="link-btn" onClick={() => setPage("planning")}>Générer →</button></p>
          </div>
        )}
        {page === "admin" && magasin.is_admin && <AdminPage />}
      </main>
    </div>
  )
}

function Nav({ page, setPage, magasin, onLogout }) {
  const tabs = [
    ["planning", "Générer"],
    ["personnel", "Personnel"],
    ["resultats", "Résultats"],
    ...(magasin.is_admin ? [["admin", "Admin"]] : []),
  ]
  return (
    <header className="nav" style={{ height: "auto", flexDirection: "column", padding: "10px 16px", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <div className="nav-brand">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>{magasin.nom}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout} style={{ fontSize: 11 }}>Déconnexion</button>
        </div>  
          
          
        
        
        </div>
          <div className="nav-logo">AC</div>
      </div>
      <nav className="nav-tabs" style={{ width: "100%", justifyContent: "flex-start" }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setPage(id)}
            className={`nav-tab ${page === id ? "active" : ""}`}>{label}</button>
        ))}
      </nav>
    </header>
  )
}