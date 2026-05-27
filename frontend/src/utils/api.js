const BASE = "https://action-planning-api.onrender.com/api"

export async function fetchPersonnel() {
  const res = await fetch(`${BASE}/personnel/`)
  if (!res.ok) throw new Error("Erreur chargement personnel")
  return res.json()
}

export async function addPersonnel(nom, poste = "") {
  const res = await fetch(`${BASE}/personnel/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom, poste }),
  })
  if (!res.ok) throw new Error("Erreur ajout employé")
  return res.json()
}

export async function updatePersonnel(id, nom, poste = "") {
  const res = await fetch(`${BASE}/personnel/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom, poste }),
  })
  if (!res.ok) throw new Error("Erreur modification employé")
  return res.json()
}

export async function deletePersonnel(id) {
  const res = await fetch(`${BASE}/personnel/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Erreur suppression employé")
  return res.json()
}

export async function genererPlanning(payload) {
  const res = await fetch(`${BASE}/planning/generer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || "Erreur génération planning")
  }
  return res.json()
}
