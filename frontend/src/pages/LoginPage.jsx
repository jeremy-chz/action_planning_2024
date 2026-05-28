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
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)",
    }}>
      <div style={{ width: 360, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            background: "linear-gradient(135deg, var(--blue), var(--cyan))",
            borderRadius: 16, width: 56, height: 56, margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 20, color: "#fff",
          }}>AC</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Planning</h1>
          <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 4 }}>Connectez-vous à votre magasin</p>
        </div>

        <div className="card">
          <div className="field">
            <label className="input-label">Identifiant magasin</label>
            <input
              className="input"
              placeholder="login"
              value={loginStr}
              onChange={e => setLoginStr(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              autoCapitalize="none"
            />
          </div>
          <div className="field">
            <label className="input-label">Mot de passe</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
            />
          </div>
          {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}
          <button
            className="btn btn-primary btn-full"
            onClick={handleLogin}
            disabled={loading || !loginStr.trim() || !password.trim()}
          >
            {loading ? <span className="spinner" /> : "Se connecter"}
          </button>
        </div>
      </div>
    </div>
  )
}