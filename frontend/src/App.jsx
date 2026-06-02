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
    const m = getMagasin()
    if (m) {
      fetchMe()
        .then(me => {
          setMagasinState(me)
          setMagasin(me)
          setPage(me.is_admin ? "admin" : "planning")
        })
        .catch(() => { removeToken(); setMagasinState(null) })
        .finally(() => setChecking(false))
    } else {
      setChecking(false)
    }
  }, [])

  const handleLogin = (m) => {
    setMagasinState(m)
    setPage(m.is_admin ? "admin" : "planning")
  }

  const handleLogout = () => {
    removeToken()
    setMagasinState(null)
    setPlanningData(null)
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
          <ResultatsPage data={planningData} />
        )}
        {page === "resultats" && !planningData && (
          <div className="empty-state">
            <p>Aucun planning généré. <button className="link-btn" onClick={() => setPage("planning")}>Générer</button></p>
          </div>
        )}
        {page === "admin" && magasin.is_admin && <AdminPage />}
      </main>
    </div>
  )
}

function Nav({ page, setPage, magasin, onLogout }) {
  const tabs = magasin.is_admin
    ? [["admin", "Administration"]]
    : [
        ["planning", "Planning"],
        ["personnel", "Personnel"],
        ["resultats", "Résultats"],
      ]

  return (
    <>
      <header className="nav">
        <nav className="nav-tabs">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`nav-tab ${page === id ? "active" : ""}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Déconnexion</button>
        </div>
      </header>
      <div className="nav-subbar">
        <span className="nav-store">{magasin.nom}</span>
      </div>
    </>
  )
}
