import { useState, useRef } from "react"
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs"

const COMPETENCES = ["lourd", "fragile"]
const PRIO_LABEL  = { 1: "🔴 Urgent", 2: "🔵 Normal", 3: "⚪ Basse" }
const PRIO_CLASS  = { 1: "badge-prio1", 2: "badge-prio2", 3: "badge-prio3" }

// ─── Parsers fichier ─────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  const result = []
  const errors = []

  // Détecter le séparateur (virgule ou point-virgule)
  const sep = lines[0].includes(";") ? ";" : ","

  // Sauter la première ligne si c'est un header (contient du texte non numérique)
  let startIdx = 0
  const firstCells = lines[0].split(sep)
  if (isNaN(firstCells[1]?.trim())) startIdx = 1

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cells = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ""))
    const barcode = cells[0]
    const duration_min = parseInt(cells[1])

    if (!barcode) { errors.push(`Ligne ${i + 1} : code charrette manquant`); continue }
    if (isNaN(duration_min) || duration_min <= 0) { errors.push(`Ligne ${i + 1} : durée invalide "${cells[1]}"`); continue }

    result.push({
      barcode,
      duration_min,
      priorite: 2,
      not_before: "",
      competences_requises: [],
    })
  }
  return { rows: result, errors }
}

async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(new Uint8Array(e.target.result), { type: "array" })
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })
        const result = [], errors = []
        let startIdx = rows[0] && isNaN(rows[0][1]) ? 1 : 0
        for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i]
          if (!row || row.length < 2) continue
          const barcode = String(row[0] ?? "").trim()
          const duration_min = parseInt(row[1])
          if (!barcode) { errors.push(`Ligne ${i+1} : code manquant`); continue }
          if (isNaN(duration_min) || duration_min <= 0) { errors.push(`Ligne ${i+1} : durée invalide`); continue }
          result.push({ barcode, duration_min, priorite: 2, not_before: "", competences_requises: [] })
        }
        resolve({ rows: result, errors })
      } catch(err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ─── Composant ───────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api"
export default function CharretteInput({ charrettes, onChange }) {
  const [advanced, setAdvanced] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [photos, setPhotos]       = useState([])
  const [scanning, setScanning]   = useState(false)
  const [importMsg, setImportMsg] = useState(null)   // { type: "success"|"error", text }
  const [form, setForm]         = useState({
    barcode: "", duration_min: 30, priorite: 2, not_before: "", competences_requises: []
  })
  const fileRef = useRef()
  const cameraRef = useRef()

  // ── Saisie rapide texte ────────────────────────────────────────────────────
  const toggleComp = c => setForm(f => ({
    ...f,
    competences_requises: f.competences_requises.includes(c)
      ? f.competences_requises.filter(x => x !== c)
      : [...f.competences_requises, c]
  }))

  const addManual = () => {
    if (!form.barcode.trim()) return
    onChange([...charrettes, { ...form, barcode: form.barcode.trim() }])
    setForm({ barcode: "", duration_min: 30, priorite: 2, not_before: "", competences_requises: [] })
  }

  const remove = i => onChange(charrettes.filter((_, j) => j !== i))
  const clearAll = () => { if (confirm(`Supprimer les ${charrettes.length} charrettes ?`)) onChange([]) }

const handlePhotos = (files) => {
  if (!files || files.length === 0) return
  const promises = Array.from(files).map(file => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.readAsDataURL(file)
    })
  })
  Promise.all(promises).then(newPhotos => {
    setPhotos(p => {
      const updated = [...p, ...newPhotos]
      console.log("Photos chargées:", updated.length)
      return updated
    })
  })
}

const analyserPhotos = async () => {
  if (photos.length === 0) return
  setScanning(true)
  setImportMsg(null)
  console.log("Début analyse, nb photos:", photos.length)
  console.log("API_BASE:", API_BASE)
  try {
    console.log("Envoi à l'API...")
    const res = await fetch(`${API_BASE}/scan/analyser`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: photos }),
    })
    console.log("Réponse status:", res.status)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || "Erreur analyse")
    }
    const data = await res.json()
    console.log("Data reçue:", data)
    if (data.length === 0) {
      setImportMsg({ type: "error", text: "Aucune charrette détectée." })
    } else {
      onChange([...charrettes, ...data.map(d => ({
        barcode: d.barcode,
        duration_min: d.duration_min,
        priorite: 2, not_before: "", competences_requises: [],
      }))])
      setImportMsg({ type: "success", text: `✅ ${data.length} charrette(s) extraite(s) depuis ${photos.length} photo(s)` })
      setPhotos([])
      setTimeout(() => setImportMsg(null), 4000)
    }
  } catch (err) {
    setImportMsg({ type: "error", text: `Erreur : ${err.message}` })
  }
  setScanning(false)
}

  // ── Import fichier ─────────────────────────────────────────────────────────
  const handleFile = async (file) => {
    if (!file) return
    setImportMsg(null)
    try {
      let parsed
      const ext = file.name.split(".").pop().toLowerCase()

      if (ext === "csv" || ext === "txt") {
        const text = await file.text()
        parsed = parseCSV(text)
      } else if (ext === "xlsx" || ext === "xls") {
        parsed = await parseExcel(file)
      } else {
        setImportMsg({ type: "error", text: "Format non supporté. Utilisez .csv ou .xlsx" })
        return
      }

      if (parsed.rows.length === 0 && parsed.errors.length > 0) {
        setImportMsg({ type: "error", text: `Aucune ligne valide.\n${parsed.errors.join("\n")}` })
        return
      }

      onChange([...charrettes, ...parsed.rows])
      let msg = `✅ ${parsed.rows.length} charrette${parsed.rows.length > 1 ? "s" : ""} importée${parsed.rows.length > 1 ? "s" : ""}`
      if (parsed.errors.length > 0) msg += ` (${parsed.errors.length} ligne${parsed.errors.length > 1 ? "s" : ""} ignorée${parsed.errors.length > 1 ? "s" : ""})`
      setImportMsg({ type: parsed.errors.length > 0 ? "warning" : "success", text: msg })
      setTimeout(() => setImportMsg(null), 4000)
    } catch (err) {
      setImportMsg({ type: "error", text: `Erreur lecture fichier : ${err.message}` })
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* - Zone drag & drop - */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--blue)" : "var(--border2)"}`,
          borderRadius: 10,
          padding: "22px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging ? "rgba(37,99,235,0.06)" : "var(--bg3)",
          transition: "all 0.15s",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: dragging ? "var(--blue-light)" : "var(--text2)" }}>
          Glisser un fichier Excel ou CSV ici
        </div>
        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
          ou <span style={{ color: "var(--blue-light)", textDecoration: "underline" }}>cliquer pour parcourir</span>
          {" "}— Col. A : code charrette · Col. B : durée (min)
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          style={{ display: "none" }}
          onChange={e => { handleFile(e.target.files[0]); e.target.value = "" }}
        />
      </div>

      {/* Message import */}
      {importMsg && (
        <div className={`alert alert-${importMsg.type === "success" ? "success" : importMsg.type === "warning" ? "warning" : "danger"}`}
          style={{ marginBottom: 12, fontSize: 13 }}>
          {importMsg.text}
        </div>
      )}


      {/* Bouton Scanner */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: 15, padding: "12px 20px" }}
            onClick={() => cameraRef.current.click()}
          >
            Scanner un tableau
          </button>

          {photos.length > 0 && (
            <>
              <span style={{ color: "var(--text2)", fontSize: 13 }}>
                {photos.length} photo{photos.length > 1 ? "s" : ""} chargée{photos.length > 1 ? "s" : ""}
              </span>
              <button
                className="btn btn-primary"
                style={{ background: "var(--green)" }}
                onClick={analyserPhotos}
                disabled={scanning}
              >
                {scanning ? <><span className="spinner" /> Analyse…</> : `Analyser ${photos.length} photo${photos.length > 1 ? "s" : ""}`}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPhotos([])}>
                Annuler
              </button>
            </>
          )}
        </div>
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
          Prends une ou plusieurs photos du tableau - les codes et durées sont extraits automatiquement
        </p>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={e => { handlePhotos(e.target.files); e.target.value = "" }}
        />
      </div>

      {/* - Ajout avancé - */}
      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setAdvanced(!advanced)}>
          {advanced ? "▼" : "＋"} Ajout avec options avancées
        </button>
      </div>

      {advanced && (
        <div className="card" style={{ marginBottom: 16, background: "var(--bg3)" }}>
          <div className="row">
            <div className="field">
              <label className="input-label">Code charrette *</label>
              <input className="input" placeholder="ABC123" value={form.barcode}
                onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
            </div>
            <div className="field">
              <label className="input-label">Durée (min) *</label>
              <input type="number" className="input" min={1} max={480} value={form.duration_min}
                onChange={e => setForm(f => ({ ...f, duration_min: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label className="input-label">Priorité</label>
              <select className="input" value={form.priorite}
                onChange={e => setForm(f => ({ ...f, priorite: parseInt(e.target.value) }))}>
                <option value={1}>🔴 Urgente</option>
                <option value={2}>🔵 Normale</option>
                <option value={3}>⚪ Basse priorité</option>
              </select>
            </div>
            <div className="field">
              <label className="input-label">Pas avant (heure)</label>
              <input type="time" className="input" value={form.not_before}
                onChange={e => setForm(f => ({ ...f, not_before: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label className="input-label">Compétences requises</label>
            <div className="chips">
              {COMPETENCES.map(c => (
                <div key={c} className={`chip ${form.competences_requises.includes(c) ? "active" : ""}`}
                  onClick={() => toggleComp(c)}>{c}</div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={addManual} disabled={!form.barcode.trim()}>
            ＋ Ajouter cette charrette
          </button>
        </div>
      )}

      {/* - Liste des charrettes - */}
      {charrettes.length > 0 && (
        <div>
          <div className="card-title" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{charrettes.length} charrette{charrettes.length > 1 ? "s" : ""} — {charrettes.reduce((s, c) => s + c.duration_min, 0)} min total</span>
            <button className="btn btn-danger btn-sm" onClick={clearAll} style={{ fontSize: 11 }}>Tout supprimer</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {charrettes.map((c, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px", background: "var(--bg3)",
                border: "1px solid var(--border)", borderRadius: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="barcode-mono" style={{ fontWeight: 600 }}>{c.barcode}</span>
                  <span style={{ color: "var(--text2)", fontSize: 12 }}>{c.duration_min} min</span>
                  <span className={`badge ${PRIO_CLASS[c.priorite]}`}>{PRIO_LABEL[c.priorite]}</span>
                  {c.not_before && (
                    <span className="badge" style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa" }}>{c.not_before}</span>
                  )}
                  {c.competences_requises?.map(comp => (
                    <span key={comp} className="badge badge-partial">{comp}</span>
                  ))}
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => remove(i)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
