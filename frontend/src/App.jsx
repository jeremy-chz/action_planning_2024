import { useState } from "react"
import PersonnelPage from "./pages/PersonnelPage"
import PlanningPage from "./pages/PlanningPage"
import ResultatsPage from "./pages/ResultatsPage"
import "./index.css"

export default function App() {
  const [page, setPage] = useState("planning")
  const [planningData, setPlanningData] = useState(null)

  return (
    <div className="app-root">
      <Nav page={page} setPage={setPage} />
      <main className="main-content">
        {page === "planning" && (
          <PlanningPage
            onResultats={(data) => { setPlanningData(data); setPage("resultats") }}
          />
        )}
        {page === "personnel" && <PersonnelPage />}
        {page === "resultats" && planningData && (
          <ResultatsPage data={planningData} onBack={() => setPage("planning")} />
        )}
        {page === "resultats" && !planningData && (
          <div className="empty-state">
            <p>Aucun planning généré. <button className="link-btn" onClick={() => setPage("planning")}>Générer un planning →</button></p>
          </div>
        )}
      </main>
    </div>
  )
}

function Nav({ page, setPage }) {
  const tabs = [
    ["planning", "Générer"],
    ["personnel", "Personnel"],
    ["resultats", "Résultats"],
  ]
  return (
    <header className="nav">
      <div className="nav-brand">
        <div className="nav-logo">AC</div>
        <span className="nav-title">Action <strong>Planning</strong></span>
        <span className="nav-badge">BETA 3.0</span>
      </div>
      <nav className="nav-tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            className={`nav-tab ${page === id ? "active" : ""}`}
          >{label}</button>
        ))}
      </nav>
    </header>
  )
}
