const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api"

function getToken() {
  return localStorage.getItem("token")
}

function authHeaders() {
  const token = getToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

export function setToken(token) { localStorage.setItem("token", token) }
export function removeToken()   { localStorage.removeItem("token"); localStorage.removeItem("magasin") }
export function getMagasin()    { return JSON.parse(localStorage.getItem("magasin") || "null") }
export function setMagasin(m)   { localStorage.setItem("magasin", JSON.stringify(m)) }

export async function login(loginStr, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: loginStr, password }),
  })
  if (!res.ok) throw new Error("Login ou mot de passe incorrect")
  return res.json()
}

export async function fetchMe() {
  const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders() })
  if (!res.ok) throw new Error("Non authentifié")
  return res.json()
}

export async function fetchPersonnel() {
  const res = await fetch(`${BASE}/personnel/`, { headers: authHeaders() })
  if (!res.ok) throw new Error("Erreur chargement personnel")
  return res.json()
}

export async function addPersonnel(nom, poste = "") {
  const res = await fetch(`${BASE}/personnel/`, {
    method: "POST", headers: authHeaders(),
    body: JSON.stringify({ nom, poste }),
  })
  if (!res.ok) throw new Error("Erreur ajout employé")
  return res.json()
}

export async function updatePersonnel(id, nom, poste = "") {
  const res = await fetch(`${BASE}/personnel/${id}`, {
    method: "PUT", headers: authHeaders(),
    body: JSON.stringify({ nom, poste }),
  })
  if (!res.ok) throw new Error("Erreur modification employé")
  return res.json()
}

export async function deletePersonnel(id) {
  const res = await fetch(`${BASE}/personnel/${id}`, {
    method: "DELETE", headers: authHeaders()
  })
  if (!res.ok) throw new Error("Erreur suppression employé")
  return res.json()
}

export async function genererPlanning(payload) {
  const res = await fetch(`${BASE}/planning/generer`, {
    method: "POST", headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || "Erreur génération planning")
  }
  return res.json()
}

export async function fetchMagasins() {
  const res = await fetch(`${BASE}/admin/magasins`, { headers: authHeaders() })
  if (!res.ok) throw new Error("Erreur chargement magasins")
  return res.json()
}

export async function createMagasin(login, password, nom) {
  const res = await fetch(`${BASE}/admin/magasins`, {
    method: "POST", headers: authHeaders(),
    body: JSON.stringify({ login, password, nom }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || "Erreur création magasin")
  }
  return res.json()
}

export async function updateMagasin(id, data) {
  const res = await fetch(`${BASE}/admin/magasins/${id}`, {
    method: "PUT", headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Erreur modification magasin")
  return res.json()
}

export async function deleteMagasin(id) {
  const res = await fetch(`${BASE}/admin/magasins/${id}`, {
    method: "DELETE", headers: authHeaders()
  })
  if (!res.ok) throw new Error("Erreur suppression magasin")
  return res.json()
}

export async function updateTemplate(id, templateData) {
  const res = await fetch(`${BASE}/personnel/${id}`, {
    method: "PUT", headers: authHeaders(),
    body: JSON.stringify(templateData),
  })
  if (!res.ok) throw new Error("Erreur mise à jour template")
  return res.json()
}