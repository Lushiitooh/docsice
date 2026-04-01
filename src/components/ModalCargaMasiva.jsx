import { useState, useRef } from 'react'
import { Modal, Btn, Input } from './ui'
import { C, slugify, calcularVencimientoAuto } from '../constants'
import { subirDocumento } from '../firebase/service'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// Extrae fecha del nombre de archivo: busca patrón YYYY-MM-DD o DDMMYYYY o DD-MM-YYYY
const extraerFechaDeNombre = (nombre) => {
  // Formato ISO: 2024-03-15
  let m = nombre.match(/(\d{4}[-_]?\d{2}[-_]?\d{2})/)
  if (m) {
    const s = m[1].replace(/[_]/g, '-')
    const d = new Date(s)
    if (!isNaN(d.getTime())) return s.slice(0, 10)
  }
  // Formato DD-MM-YYYY o DD/MM/YYYY
  m = nombre.match(/(\d{2})[-\/](\d{2})[-\/](\d{4})/)
  if (m) {
    const iso = `${m[3]}-${m[2]}-${m[1]}`
    const d = new Date(iso)
    if (!isNaN(d.getTime())) return iso
  }
  return null
}

// Distancia de edición simple (Levenshtein) para fuzzy match de slugs
const levenshtein = (a, b) => {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

// Encuentra el tipo de doc que mejor coincide con el slug del nombre de archivo
const matchDocTipo = (fileSlug, docTipos) => {
  if (!docTipos.length) return null
  let best = null, bestScore = Infinity
  for (const dt of docTipos) {
    const tipoSlug = slugify(dt.nombre)
    // Contiene completo → máxima prioridad
    if (tipoSlug === fileSlug) return { docTipo: dt, score: 0 }
    if (fileSlug.includes(tipoSlug) || tipoSlug.includes(fileSlug)) {
      const score = Math.abs(fileSlug.length - tipoSlug.length)
      if (score < bestScore) { bestScore = score; best = dt }
      continue
    }
    // Fuzzy: distancia Levenshtein normalizada
    const dist = levenshtein(fileSlug, tipoSlug)
    const norm = dist / Math.max(fileSlug.length, tipoSlug.length)
    if (norm < 0.45 && dist < bestScore) { bestScore = dist; best = dt }
  }
  return best ? { docTipo: best, score: bestScore } : null
}

// ─── PASO 1: GUÍA DE NOMBRES ─────────────────────────────────────────────────
const PasoGuia = ({ docTipos, onContinuar }) => (
  <div>
    <p style={{ fontSize:13, color:C.textMuted, margin:'0 0 12px' }}>
      Renombra tus archivos usando este esquema y la app los detectará automáticamente.
      La fecha en el nombre se usa para calcular el vencimiento.
    </p>

    {/* Formato */}
    <div style={{ background:'#1e293b', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
      <div style={{ fontFamily:'monospace', fontSize:13, color:'#7dd3fc' }}>
        <span style={{ color:'#86efac' }}>slug-documento</span>
        <span style={{ color:'#fff' }}>_</span>
        <span style={{ color:'#fbbf24' }}>YYYY-MM-DD</span>
        <span style={{ color:'#94a3b8' }}>.pdf</span>
      </div>
      <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>
        La fecha es opcional para documentos permanentes.
      </div>
    </div>

    {/* Tabla de slugs */}
    <div style={{ fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase',
      letterSpacing:'0.05em', marginBottom:6 }}>
      Slugs disponibles
    </div>
    <div style={{ maxHeight:260, overflowY:'auto', border:`1px solid ${C.border}`,
      borderRadius:8, marginBottom:14 }}>
      {docTipos.map((dt, i) => (
        <div key={dt.id} style={{ display:'flex', alignItems:'center', gap:10,
          padding:'8px 12px',
          borderBottom: i < docTipos.length - 1 ? `1px solid ${C.border}` : 'none',
          background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
          <span style={{ fontFamily:'monospace', fontSize:12, color:'#1d4ed8',
            background:'#eff6ff', padding:'2px 7px', borderRadius:5, whiteSpace:'nowrap' }}>
            {slugify(dt.nombre)}
          </span>
          <span style={{ fontSize:12, color:C.text, flex:1 }}>{dt.nombre}</span>
          <span style={{ fontSize:10, color:C.textMuted, whiteSpace:'nowrap' }}>
            {dt.tipo === 'con_vencimiento' ? '📅' : '♾️'}
          </span>
        </div>
      ))}
    </div>

    {/* Reglas de vigencia */}
    <div style={{ background:'#fffbeb', border:`1px solid #fde68a`, borderRadius:8,
      padding:'10px 12px', marginBottom:16, fontSize:12 }}>
      <div style={{ fontWeight:700, color:'#92400e', marginBottom:4 }}>⚡ Cálculo automático de vencimiento</div>
      <div style={{ color:'#78350f', lineHeight:1.6 }}>
        • <strong>Cursos ACHS</strong> (slug contiene "achs") → fecha del doc + 2 años<br/>
        • <strong>Otros con vencimiento</strong> → debes indicar la fecha manualmente en la previsualización
      </div>
    </div>

    <div style={{ display:'flex', justifyContent:'flex-end' }}>
      <Btn onClick={onContinuar}>Entendido, seleccionar archivos →</Btn>
    </div>
  </div>
)

// ─── PASO 2: PREVISUALIZACIÓN DEL MAPEO ──────────────────────────────────────
const PasoPreview = ({ items, setItems, docTipos, onSubir, subiendo, progreso }) => {
  const tiposMap = Object.fromEntries(docTipos.map(d => [d.id, d]))

  const setFecha = (idx, fecha) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, fechaVenc: fecha } : it))

  const setDocTipoId = (idx, id) =>
    setItems(prev => prev.map((it, i) => i === idx
      ? { ...it, docTipoId: id, docTipo: tiposMap[id] || null }
      : it))

  const toggleIgnorar = (idx) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ignorar: !it.ignorar } : it))

  const listos  = items.filter(it => !it.ignorar && it.docTipoId)
  const sinMapa = items.filter(it => !it.ignorar && !it.docTipoId)
  const faltaFecha = listos.filter(it =>
    tiposMap[it.docTipoId]?.tipo === 'con_vencimiento' && !it.fechaVenc
  )

  return (
    <div>
      <p style={{ fontSize:13, color:C.textMuted, margin:'0 0 12px' }}>
        Revisa el mapeo automático. Puedes corregir el tipo de documento y la fecha antes de subir.
      </p>

      {sinMapa.length > 0 && (
        <div style={{ padding:'8px 12px', background:'#fffbeb', border:`1px solid #fde68a`,
          borderRadius:8, fontSize:12, color:'#92400e', marginBottom:10 }}>
          ⚠️ {sinMapa.length} archivo{sinMapa.length > 1 ? 's' : ''} sin tipo asignado. Asígnalo manualmente o márcalos como ignorar.
        </div>
      )}
      {faltaFecha.length > 0 && (
        <div style={{ padding:'8px 12px', background:'#fef2f2', border:`1px solid #fecaca`,
          borderRadius:8, fontSize:12, color:'#991b1b', marginBottom:10 }}>
          📅 {faltaFecha.length} archivo{faltaFecha.length > 1 ? 's' : ''} con vencimiento sin fecha. Completa antes de subir.
        </div>
      )}

      <div style={{ maxHeight:340, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
        {items.map((it, idx) => (
          <div key={idx} style={{ border:`1px solid ${it.ignorar ? C.border : it.docTipoId ? '#bfdbfe' : '#fde68a'}`,
            borderRadius:10, padding:12,
            background: it.ignorar ? '#f8fafc' : it.docTipoId ? '#eff6ff' : '#fffbeb',
            opacity: it.ignorar ? 0.5 : 1 }}>

            {/* Nombre del archivo */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <div style={{ fontFamily:'monospace', fontSize:11, color:'#475569',
                wordBreak:'break-all', flex:1, marginRight:8 }}>
                📄 {it.file.name}
              </div>
              <button onClick={() => toggleIgnorar(idx)}
                style={{ background:'none', border:'none', cursor:'pointer',
                  fontSize:11, color:C.textMuted, whiteSpace:'nowrap', padding:'2px 6px' }}>
                {it.ignorar ? '+ Incluir' : '× Ignorar'}
              </button>
            </div>

            {!it.ignorar && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {/* Selector de tipo */}
                <select
                  value={it.docTipoId || ''}
                  onChange={e => setDocTipoId(idx, e.target.value)}
                  style={{ flex:2, minWidth:160, padding:'7px 10px',
                    border:`1px solid ${it.docTipoId ? C.border : '#f59e0b'}`,
                    borderRadius:7, fontSize:13, fontFamily:'inherit', background:'#fff',
                    color: it.docTipoId ? C.text : '#92400e' }}>
                  <option value="">— Seleccionar tipo —</option>
                  {docTipos.map(dt => (
                    <option key={dt.id} value={dt.id}>{dt.nombre}</option>
                  ))}
                </select>

                {/* Fecha de vencimiento */}
                {it.docTipoId && tiposMap[it.docTipoId]?.tipo === 'con_vencimiento' && (
                  <input
                    type="date"
                    value={it.fechaVenc || ''}
                    onChange={e => setFecha(idx, e.target.value)}
                    style={{ flex:1, minWidth:140, padding:'7px 10px',
                      border:`1px solid ${it.fechaVenc ? C.border : '#ef4444'}`,
                      borderRadius:7, fontSize:13, fontFamily:'inherit' }}
                  />
                )}

                {/* Fecha extraída / vencimiento calculado */}
                {it.fechaVenc && (
                  <span style={{ fontSize:11, color:C.green, alignSelf:'center', whiteSpace:'nowrap' }}>
                    ✓ Vence {it.fechaVenc}
                  </span>
                )}
                {!it.fechaVenc && it.fechaBase && (
                  <span style={{ fontSize:11, color:C.textMuted, alignSelf:'center' }}>
                    Fecha doc: {it.fechaBase}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Barra de progreso mientras sube */}
      {subiendo && progreso && (
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12,
            color:C.textMuted, marginBottom:4 }}>
            <span>{progreso.msg}</span>
            <span>{progreso.actual}/{progreso.total}</span>
          </div>
          <div style={{ background:'#e2e8f0', borderRadius:99, height:7, overflow:'hidden' }}>
            <div style={{ height:'100%', background:C.blue, borderRadius:99,
              width:`${Math.round((progreso.actual / progreso.total) * 100)}%`,
              transition:'width 0.3s ease' }} />
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <div style={{ fontSize:12, color:C.textMuted, alignSelf:'center', marginRight:'auto' }}>
          {listos.length} archivo{listos.length !== 1 ? 's' : ''} a subir
        </div>
        <Btn onClick={onSubir}
          disabled={subiendo || listos.length === 0 || faltaFecha.length > 0}>
          {subiendo ? 'Subiendo...' : `📤 Subir ${listos.length} archivo${listos.length !== 1 ? 's' : ''}`}
        </Btn>
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export const ModalCargaMasiva = ({
  trabajador,
  contrato,
  docTipos,
  docsCargados,
  uid,
  onClose,
  onDone,
}) => {
  const [paso, setPaso]         = useState('guia')     // 'guia' | 'preview'
  const [items, setItems]       = useState([])
  const [subiendo, setSubiendo] = useState(false)
  const [progreso, setProgreso] = useState(null)
  const fileRef                 = useRef()

  const procesarArchivos = (files) => {
    const docsTiposActivos = docTipos.filter(d => d.activo !== false)
    const parsed = Array.from(files).map(file => {
      const nameNoExt = file.name.replace(/\.[^.]+$/, '')
      const fileSlug  = slugify(nameNoExt)
      const fechaBase = extraerFechaDeNombre(nameNoExt)

      // Intentar match con tipos de doc
      const match = matchDocTipo(fileSlug, docsTiposActivos)
      const docTipo = match?.docTipo || null

      // Calcular vencimiento automático
      let fechaVenc = null
      if (docTipo && fechaBase) {
        fechaVenc = calcularVencimientoAuto(docTipo.nombre, fechaBase)
        // Si no hay auto-cálculo pero el tipo es con_vencimiento y tenemos fecha base,
        // usar fecha base como punto de partida para que el usuario la vea y ajuste
        if (!fechaVenc && docTipo.tipo === 'con_vencimiento') {
          fechaVenc = fechaBase  // precargar con la fecha del doc
        }
      }

      return {
        file,
        docTipoId:  docTipo?.id || '',
        docTipo,
        fechaBase,
        fechaVenc,
        ignorar:    false,
      }
    })
    setItems(parsed)
    setPaso('preview')
  }

  const seleccionarArchivos = (e) => {
    const files = e.target.files
    if (files?.length) procesarArchivos(files)
  }

  const onDrop = (e) => {
    e.preventDefault()
    procesarArchivos(e.dataTransfer.files)
  }

  const subirTodo = async () => {
    const aSubir = items.filter(it => !it.ignorar && it.docTipoId)
    if (!aSubir.length) return
    setSubiendo(true)
    setProgreso({ actual: 0, total: aSubir.length, msg: 'Iniciando...' })

    for (let i = 0; i < aSubir.length; i++) {
      const it = aSubir[i]
      setProgreso({
        actual: i + 1,
        total:  aSubir.length,
        msg:    it.docTipo?.nombre || it.file.name,
      })
      await subirDocumento({
        trabajadorId: trabajador.id,
        contratoId:   contrato.id,
        docTipoId:    it.docTipoId,
        archivo:      it.file,
        fechaVenc:    it.fechaVenc || null,
        uid,
      })
    }

    setSubiendo(false)
    setProgreso(null)
    onDone()
    onClose()
  }

  return (
    <Modal
      title={paso === 'guia' ? '📂 Carga masiva — Guía de nombres' : '📂 Carga masiva — Previsualización'}
      onClose={subiendo ? undefined : onClose}
    >
      {paso === 'guia' && (
        <PasoGuia
          docTipos={docTipos}
          onContinuar={() => {
            // Abre selector de archivos
            fileRef.current?.click()
          }}
        />
      )}

      {/* Input de archivos oculto */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        style={{ display:'none' }}
        onChange={seleccionarArchivos}
      />

      {/* Zona de drop (visible en paso guía como alternativa) */}
      {paso === 'guia' && (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          style={{ border:`2px dashed ${C.border}`, borderRadius:10, padding:16,
            textAlign:'center', marginTop:10, cursor:'pointer', color:C.textMuted,
            fontSize:12 }}
          onClick={() => fileRef.current?.click()}>
          O arrastra los archivos aquí
        </div>
      )}

      {paso === 'preview' && (
        <PasoPreview
          items={items}
          setItems={setItems}
          docTipos={docTipos}
          onSubir={subirTodo}
          subiendo={subiendo}
          progreso={progreso}
        />
      )}
    </Modal>
  )
}
