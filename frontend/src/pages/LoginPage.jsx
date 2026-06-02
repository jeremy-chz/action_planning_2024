import { useState } from "react"
import { login, setToken, setMagasin } from "../utils/api"

export default function LoginPage({ onLogin }) {
  const [loginStr, setLoginStr] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  const handleLogin = async () => {
    if (!loginStr.trim() || !password.trim()) return
    setLoading(true)
    setError("")
    try {
      const data = await login(loginStr.trim(), password)
      setToken(data.token)
      setMagasin({ nom: data.nom, is_admin: data.is_admin })
      onLogin({ nom: data.nom, is_admin: data.is_admin })
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{ width: 340, padding: "0 20px" }}>

        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 20, fontWeight: 400, letterSpacing: "-0.01em", color: "var(--text)" }}>
            Planning
          </h1>
          <p style={{ color: "var(--text3)", fontSize: 12, marginTop: 4 }}>
            Accès réservé aux magasins autorisés
          </p>
        </div>

        <div className="card">
          <div className="field">
            <label className="input-label">Identifiant</label>
            <input
              className="input"
              placeholder=""
              value={loginStr}
              onChange={e => setLoginStr(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              autoCapitalize="none"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label className="input-label">Mot de passe</label>
            <input
              className="input"
              type="password"
              placeholder=""
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 14 }}>
              {error}
            </div>
          )}
          <button
            className="btn btn-primary btn-full"
            onClick={handleLogin}
            disabled={loading || !loginStr.trim() || !password.trim()}
          >
            {loading ? <span className="spinner" /> : "Connexion"}
          </button>
        </div>
      </div>
    </div>
  )
}
