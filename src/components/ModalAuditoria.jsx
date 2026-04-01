import { useState } from 'react'
import JSZip from 'jszip'
import { Modal, Btn } from './ui'
import { C, codeOf } from '../constants'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const sanitize = (str = '') =>
  str.replace(/[/\\:*?"<>|]/g, '_').trim() || 'sin_nombre'

const extension = (url = '') => {
  const path = url.split('?')[0]
  const dot  = path.lastIndexOf('.')
  if (dot === -1) return '.pdf'
  const ext = path.slice(dot).toLowerCase()
  return ['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.pdf'
}

const fetchBlob = async (url) => {
  // Cloudinary permite CORS sin credenciales desde cualquier origen
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.blob()
}

// ─── COMPONENTE ───────────────────────────────────────────────────────────────
export const ModalAuditoria = ({
  contrato,
  docTipos,        // todos los tipos del contrato
  trabajadores,    // lista de trabajadores activos
  docsCargados,    // todos los docs cargados del contrato (ya en estado)
  onClose,
}) => {
  const [seleccionados, setSeleccionados] = useState(
    () => new Set(docTipos.map(d => d.id))   // todos marcados por defecto
  )
  const [progreso, setProgreso]         = useState(null)   // null | { actual, total, msg }
  const [error, setError]               = useState('')

  const toggle = (id) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    if (seleccionados.size === docTipos.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(docTipos.map(d => d.id)))
    }
  }

  const generarZip = async () => {
    if (seleccionados.size === 0) return
    setError('')
    const zip  = new JSZip()
    const code = codeOf(contrato)
    const hoy  = new Date().toISOString().slice(0, 10)

    // Filtrar docs que coincidan con los tipos seleccionados
    const docsFiltrados = docsCargados.filter(d => seleccionados.has(d.docTipoId) && d.url)

    // Agrupar por trabajador
    const porTrabajador = {}
    for (const dc of docsFiltrados) {
      if (!porTrabajador[dc.trabajadorId]) porTrabajador[dc.trabajadorId] = []
      porTrabajador[dc.trabajadorId].push(dc)
    }

    const trabajadoresConDocs = trabajadores.filter(t => porTrabajador[t.id])
    const totalArchivos = docsFiltrados.length
    let procesados = 0

    if (totalArchivos === 0) {
      setError('No hay documentos cargados para los tipos seleccionados.')
      return
    }

    setProgreso({ actual: 0, total: totalArchivos, msg: 'Preparando...' })

    const tiposMap = Object.fromEntries(docTipos.map(d => [d.id, d]))

    for (const trab of trabajadoresConDocs) {
      const carpeta = sanitize(`${trab.apellidos} ${trab.nombres} (${trab.rut})`)
      const folder  = zip.folder(carpeta)
      const docs    = porTrabajador[trab.id]

      for (let i = 0; i < docs.length; i++) {
        const dc       = docs[i]
        const tipo     = tiposMap[dc.docTipoId]
        const nombre   = tipo ? sanitize(tipo.nombre) : `doc_${i + 1}`
        const venc     = dc.fechaVenc ? `_vence_${dc.fechaVenc}` : ''
        const ext      = extension(dc.url)
        const filename = `${String(i + 1).padStart(2, '0')}_${nombre}${venc}${ext}`

        setProgreso({
          actual: procesados + 1,
          total:  totalArchivos,
          msg:    `${trab.nombres} ${trab.apellidos} — ${tipo?.nombre || 'documento'}`,
        })

        try {
          const blob = await fetchBlob(dc.url)
          folder.file(filename, blob)
        } catch {
          // Si un archivo falla, continúa con el resto
          folder.file(filename + '.ERROR.txt', `No se pudo descargar: ${dc.url}`)
        }
        procesados++
      }
    }

    setProgreso({ actual: totalArchivos, total: totalArchivos, msg: 'Generando ZIP...' })

    const blob = await zip.generateAsync({ type: 'blob' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `auditoria_${code}_${hoy}.zip`
    a.click()
    URL.revokeObjectURL(url)

    setProgreso(null)
    onClose()
  }

  const pct = progreso ? Math.round((progreso.actual / progreso.total) * 100) : 0

  return (
    <Modal title="📦 Exportar para auditoría" onClose={progreso ? undefined : onClose}>
      {!progreso && (
        <>
          {/* Instrucción */}
          <p style={{ fontSize:13, color:C.textMuted, marginTop:0, marginBottom:14 }}>
            Selecciona los tipos de documentos que quieres incluir en el ZIP.
            Se descargarán <strong>todos los trabajadores</strong> del contrato <strong>{codeOf(contrato)}</strong>.
          </p>

          {/* Seleccionar todo */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10,
            padding:'8px 12px', background:'#f8fafc', borderRadius:8, cursor:'pointer' }}
            onClick={toggleTodos}>
            <input type="checkbox" readOnly
              checked={seleccionados.size === docTipos.length}
              ref={el => { if (el) el.indeterminate = seleccionados.size > 0 && seleccionados.size < docTipos.length }}
              style={{ width:16, height:16, cursor:'pointer' }} />
            <span style={{ fontSize:13, fontWeight:700, color:C.text }}>
              {seleccionados.size === docTipos.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </span>
            <span style={{ marginLeft:'auto', fontSize:12, color:C.textMuted }}>
              {seleccionados.size}/{docTipos.length} tipos
            </span>
          </div>

          {/* Lista de tipos */}
          <div style={{ maxHeight:300, overflowY:'auto', border:`1px solid ${C.border}`,
            borderRadius:8, marginBottom:14 }}>
            {docTipos.map((dt, i) => {
              const count = docsCargados.filter(d => d.docTipoId === dt.id && d.url).length
              return (
                <div key={dt.id}
                  onClick={() => toggle(dt.id)}
                  style={{ display:'flex', alignItems:'center', gap:10,
                    padding:'10px 14px', cursor:'pointer',
                    borderBottom: i < docTipos.length - 1 ? `1px solid ${C.border}` : 'none',
                    background: seleccionados.has(dt.id) ? '#eff6ff' : '#fff',
                    transition:'background 0.1s' }}>
                  <input type="checkbox" readOnly checked={seleccionados.has(dt.id)}
                    style={{ width:15, height:15, cursor:'pointer', flexShrink:0 }} />
                  <span style={{ fontSize:13, color:C.text, flex:1 }}>{dt.nombre}</span>
                  <span style={{ fontSize:11, color: count > 0 ? C.green : C.textMuted,
                    fontWeight:600, whiteSpace:'nowrap' }}>
                    {count > 0 ? `${count} archivo${count > 1 ? 's' : ''}` : 'sin docs'}
                  </span>
                </div>
              )
            })}
          </div>

          {error && (
            <div style={{ padding:'8px 12px', background:'#fef2f2', border:`1px solid #fecaca`,
              borderRadius:8, fontSize:13, color:'#991b1b', marginBottom:12 }}>
              {error}
            </div>
          )}

          {/* Resumen */}
          <div style={{ fontSize:12, color:C.textMuted, marginBottom:16 }}>
            {(() => {
              const total = docsCargados.filter(d => seleccionados.has(d.docTipoId) && d.url).length
              return `${total} archivo${total !== 1 ? 's' : ''} a descargar · ${trabajadores.length} trabajadores`
            })()}
          </div>

          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn onClick={generarZip} disabled={seleccionados.size === 0}>
              📥 Generar ZIP
            </Btn>
          </div>
        </>
      )}

      {/* Estado de progreso */}
      {progreso && (
        <div style={{ padding:'8px 0' }}>
          <div style={{ fontSize:14, fontWeight:600, color:C.text, marginBottom:6 }}>
            Descargando documentos... {pct}%
          </div>
          <div style={{ background:'#e2e8f0', borderRadius:99, height:8, marginBottom:12, overflow:'hidden' }}>
            <div style={{ height:'100%', background:C.blue, borderRadius:99, width:`${pct}%`,
              transition:'width 0.3s ease' }} />
          </div>
          <div style={{ fontSize:12, color:C.textMuted, minHeight:36 }}>
            {progreso.msg}
          </div>
          <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>
            Archivo {progreso.actual} de {progreso.total}
          </div>
        </div>
      )}
    </Modal>
  )
}
