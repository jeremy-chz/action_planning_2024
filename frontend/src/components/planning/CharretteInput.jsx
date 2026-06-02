import { useState, useRef } from "react"
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs"

const COMPETENCES = ["lourd", "fragile"]
const PRIO_LABEL  = { 1: "Urgent", 2: "Normal", 3: "Basse" }
const PRIO_CLASS  = { 1: "badge-prio1", 2: "badge-prio2", 3: "badge-prio3" }

function parseCSV(text) {
  const lines  = text.trim().split(/\r?\n/)
  const result = []
  const errors = []
  const sep    = lines[0].includes(";") ? ";" : ","
  let startIdx = 0
  if (isNaN(lines[0].split(sep)[1]?.trim())) startIdx = 1

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const cells       = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g, ""))
    const barcode     = cells[0]
    const duration_min = parseInt(cells[1])
    if (!barcode)                              { errors.push(`Ligne ${i + 1}: code manquant`); continue }
    if (isNaN(duration_min) || duration_min <= 0) { errors.push(`Ligne ${i + 1}: durée invalide`); continue }
    result.push({ barcode, duration_min, priorite: 2, not_before: "", competences_requises: [] })
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
        const startIdx = rows[0] && isNaN(rows[0][1]) ? 1 : 0
        for (let i = startIdx; i < rows.length; i++) {
          const row      = rows[i]
          if (!row || row.length < 2) continue
          const barcode      = String(row[0] ?? "").trim()
          const duration_min = parseInt(row[1])
          if (!barcode)                              { errors.push(`Ligne ${i+1}: code manquant`); continue }
          if (isNaN(duration_min) || duration_min <= 0) { errors.push(`Ligne ${i+1}: durée invalide`); continue }
          result.push({ barcode, duration_min, priorite: 2, not_before: "", competences_requises: [] })
        }
        resolve({ rows: result, errors })
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api"

export default function CharretteInput({ charrettes, onChange }) {
  const [advanced, setAdvanced] = useState(false)
  const [photos, setPhotos]     = useState([])
  const [scanning, setScanning] = useState(false)
  const [importMsg, setImportMsg] = useState(null)
  const [form, setForm] = useState({
    barcode: "", duration_min: 30, priorite: 2, not_before: "", competences_requises: [],
  })
  const cameraRef = useRef()

  const toggleComp = c => setForm(f => ({
    ...f,
    competences_requises: f.competences_requises.includes(c)
      ? f.competences_requises.filter(x => x !== c)
      : [...f.competences_requises, c],
  }))

  const addManual = () => {
    if (!form.barcode.trim()) return
    onChange([...charrettes, { ...form, barcode: form.barcode.trim() }])
    setForm({ barcode: "", duration_min: 30, priorite: 2, not_before: "", competences_requises: [] })
  }

  const remove   = i => onChange(charrettes.filter((_, j) => j !== i))
  const clearAll = () => { if (confirm(`Supprimer les ${charrettes.length} charrettes ?`)) onChange([]) }

  const handlePhotos = (files) => {
    if (!files || files.length === 0) return
    Promise.all(Array.from(files).map(file => new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.readAsDataURL(file)
    }))).then(newPhotos => setPhotos(p => [...p, ...newPhotos]))
  }

  const analyserPhotos = async () => {
    if (photos.length === 0) return
    setScanning(true); setImportMsg(null)
    try {
      const res = await fetch(`${API_BASE}/scan/analyser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: photos }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Erreur analyse") }
      const data = await res.json()
      if (data.length === 0) {
        setImportMsg({ type: "error", text: "Aucune charrette détectée." })
      } else {
        onChange([...charrettes, ...data.map(d => ({
          barcode: d.barcode, duration_min: d.duration_min,
          priorite: 2, not_before: "", competences_requises: [],
        }))])
        setImportMsg({ type: "success", text: `${data.length} charrette(s) extraite(s) depuis ${photos.length} photo(s)` })
        setPhotos([])
        setTimeout(() => setImportMsg(null), 4000)
      }
    } catch (err) {
      setImportMsg({ type: "error", text: err.message })
    }
    setScanning(false)
  }

  const handleFile = async (file) => {
    if (!file) return
    setImportMsg(null)
    try {
      const ext = file.name.split(".").pop().toLowerCase()
      let parsed
      if (ext === "csv" || ext === "txt")       parsed = parseCSV(await file.text())
      else if (ext === "xlsx" || ext === "xls") parsed = await parseExcel(file)
      else { setImportMsg({ type: "error", text: "Format non supporté (.csv ou .xlsx)" }); return }

      if (parsed.rows.length === 0 && parsed.errors.length > 0) {
        setImportMsg({ type: "error", text: `Aucune ligne valide. ${parsed.errors.join(" — ")}` })
        return
      }
      onChange([...charrettes, ...parsed.rows])
      let msg = `${parsed.rows.length} charrette(s) importée(s)`
      if (parsed.errors.length > 0) msg += ` (${parsed.errors.length} ligne(s) ignorée(s))`
      setImportMsg({ type: parsed.errors.length > 0 ? "warning" : "success", text: msg })
      setTimeout(() => setImportMsg(null), 4000)
    } catch (err) {
      setImportMsg({ type: "error", text: `Erreur lecture : ${err.message}` })
    }
  }

  return (
    <div>
      {importMsg && (
        <div className={`alert alert-${importMsg.type === "success" ? "success" : importMsg.type === "warning" ? "warning" : "danger"}`}
          style={{ marginBottom: 12 }}>
          {importMsg.text}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={() => cameraRef.current.click()}>
            Scanner un tableau
          </button>

          {photos.length > 0 && (
            <>
              <span style={{ color: "var(--text2)", fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }}>
                {photos.length} photo{photos.length > 1 ? "s" : ""}
              </span>
              <button
                className="btn btn-ghost"
                onClick={analyserPhotos}
                disabled={scanning}
              >
                {scanning
                  ? <><span className="spinner" /> Analyse en cours</>
                  : `Analyser (${photos.length})`
                }
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setPhotos([])}>
                Annuler
              </button>
            </>
          )}
        </div>
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 6 }}>
          Photographiez le tableau TIME pour import automatique
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

      <div style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setAdvanced(!advanced)}>
          {advanced ? "Masquer" : "Ajout manuel avec options"}
        </button>
      </div>

      {advanced && (
        <div className="card" style={{ marginBottom: 16, background: "var(--bg3)" }}>
          <div className="row">
            <div className="field">
              <label className="input-label">Code charrette</label>
              <input className="input" placeholder="ABC123" value={form.barcode}
                onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addManual()}
              />
            </div>
            <div className="field">
              <label className="input-label">Durée (min)</label>
              <input type="number" className="input" min={1} max={480} value={form.duration_min}
                onChange={e => setForm(f => ({ ...f, duration_min: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label className="input-label">Priorité</label>
              <select className="input" value={form.priorite}
                onChange={e => setForm(f => ({ ...f, priorite: parseInt(e.target.value) }))}>
                <option value={1}>Urgente</option>
                <option value={2}>Normale</option>
                <option value={3}>Basse</option>
              </select>
            </div>
            <div className="field">
              <label className="input-label">Pas avant</label>
              <input type="time" className="input" value={form.not_before}
                onChange={e => setForm(f => ({ ...f, not_before: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label className="input-label">Compétences requises</label>
            <div className="chips">
              {COMPETENCES.map(c => (
                <div key={c} className={`chip ${form.competences_requises.includes(c) ? "active" : ""}`}
                  onClick={() => toggleComp(c)}>
                  {c}
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={addManual} disabled={!form.barcode.trim()}>
            Ajouter
          </button>
        </div>
      )}

      {charrettes.length > 0 && (
        <div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 8, padding: "0 0 8px", borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "IBM Plex Mono, monospace" }}>
              {charrettes.length} charrette{charrettes.length > 1 ? "s" : ""} &nbsp;·&nbsp; {charrettes.reduce((s, c) => s + c.duration_min, 0)} min
            </span>
            <button className="btn btn-danger btn-sm" onClick={clearAll} style={{ fontSize: 11 }}>
              Tout supprimer
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {charrettes.map((c, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 10px",
                background: "var(--bg3)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="barcode-mono" style={{ fontWeight: 500 }}>{c.barcode}</span>
                  <span style={{ color: "var(--text2)", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}>
                    {c.duration_min} min
                  </span>
                  {c.priorite !== 2 && (
                    <span className={`badge ${PRIO_CLASS[c.priorite]}`}>{PRIO_LABEL[c.priorite]}</span>
                  )}
                  {c.not_before && (
                    <span className="badge badge-prio2">dès {c.not_before}</span>
                  )}
                  {c.competences_requises?.map(comp => (
                    <span key={comp} className="badge badge-partial">{comp}</span>
                  ))}
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => remove(i)}>x</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
