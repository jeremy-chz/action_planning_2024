import { useState, useRef } from "react"

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
  // Charger SheetJS dynamiquement (disponible via CDN dans l'index.html ou npm)
  // On utilise l'API FileReader + SheetJS
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        // Import dynamique de SheetJS
        import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs")
          .then(XLSX => {
            const data = new Uint8Array(e.target.result)
            const wb   = XLSX.read(data, { type: "array" })
            const ws   = wb.Sheets[wb.SheetNames[0]]
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })

            const result = []
            const errors = []

            // Détecter si la première ligne est un header
            let startIdx = 0
            if (rows[0] && isNaN(rows[0][1])) startIdx = 1

            for (let i = startIdx; i < rows.length; i++) {
              const row = rows[i]
              if (!row || row.length < 2) continue
              const barcode     = String(row[0] ?? "").trim()
              const duration_min = parseInt(row[1])
              if (!barcode) { errors.push(`Ligne ${i + 1} : code manquant`); continue }
              if (isNaN(duration_min) || duration_min <= 0) { errors.push(`Ligne ${i + 1} : durée invalide`); continue }
              result.push({ barcode, duration_min, priorite: 2, not_before: "", competences_requises: [] })
            }
            resolve({ rows: result, errors })
          })
          .catch(reject)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function CharretteInput({ charrettes, onChange }) {
  const [raw, setRaw]           = useState("")
  const [advanced, setAdvanced] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [importMsg, setImportMsg] = useState(null)   // { type: "success"|"error", text }
  const [form, setForm]         = useState({
    barcode: "", duration_min: 30, priorite: 2, not_before: "", competences_requises: []
  })
  const fileRef = useRef()

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

  const parseRaw = () => {
    const matches = [...raw.matchAll(/\(([^,)]+),\s*(\d+)(?:,\s*(\d))?(?:,\s*(\d{2}:\d{2}))?\)/g)]
    if (!matches.length) { alert("Format invalide. Ex: (ABC123, 30) ou (XYZ, 45, 1, 08:30)"); return }
    const nouvelles = matches.map(m => ({
      barcode: m[1].trim(),
      duration_min: parseInt(m[2]),
      priorite: m[3] ? parseInt(m[3]) : 2,
      not_before: m[4] || "",
      competences_requises: [],
    }))
    onChange([...charrettes, ...nouvelles])
    setRaw("")
  }

  const remove = i => onChange(charrettes.filter((_, j) => j !== i))
  const clearAll = () => { if (confirm(`Supprimer les ${charrettes.length} charrettes ?`)) onChange([]) }

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


      {/* - Saisie rapide texte - */}
      <div className="field">
        <label className="input-label">Ou saisie à la main</label>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <input
              className="input"
              placeholder="Ex: (ABC123, 30), (XYZ456, 45, 1), (DEF, 20, 2, 09:00)"
              value={raw}
              onChange={e => setRaw(e.target.value)}
              onKeyDown={e => e.key === "Enter" && parseRaw()}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={parseRaw} disabled={!raw.trim()}>Ajouter</button>
        </div>
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
          Format: (code, minutes) • Optionnel: (code, min, priorité 1-3, HH:MM début au plus tôt)
        </p>
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
