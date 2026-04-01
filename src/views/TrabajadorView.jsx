import { useState, useEffect, useCallback } from 'react'
import { C } from '../constants'
import { Btn, Modal, Input, Badge, ProgressBar } from '../components/ui'
import {
  getDocTipos, getDocTiposIndividuales, getDocsCargados,
  subirDocumento, eliminarDocumento,
  addDocTipoIndividual, toggleDocTipoIndividual,
  calcularCumplimiento,
} from '../firebase/service'

export const TrabajadorView = ({ trabajador, contrato, onBack, isMobile, uid }) => {
  const [docTipos, setDocTipos]                       = useState([])
  const [docsCargados, setDocsCargados]               = useState([])
  const [loading, setLoading]                         = useState(true)
  const [modalDoc, setModalDoc]                       = useState(null)
  const [archivo, setArchivo]                         = useState(null)
  const [fechaVenc, setFechaVenc]                     = useState('')
  const [subiendo, setSubiendo]                       = useState(false)
  const [docTiposIndiv, setDocTiposIndiv]             = useState([])
  const [modalDocIndiv, setModalDocIndiv]             = useState(false)
  const [nuevoDocIndivNombre, setNuevoDocIndivNombre] = useState('')
  const [nuevoDocIndivTipo, setNuevoDocIndivTipo]     = useState('con_vencimiento')

  const cargar = useCallback(async () => {
    const [dt, dtIndiv, dc] = await Promise.all([
      getDocTipos(contrato.id), getDocTiposIndividuales(trabajador.id), getDocsCargados(trabajador.id)
    ])
    setDocTipos(dt); setDocTiposIndiv(dtIndiv); setDocsCargados(dc); setLoading(false)
  }, [trabajador.id, contrato.id])

  useEffect(() => { cargar() }, [cargar])

  const todosDocTipos = [...docTipos, ...docTiposIndiv]
  const { pct, ok, total } = calcularCumplimiento(todosDocTipos, docsCargados)

  const subirDoc = async () => {
    if (!archivo || !modalDoc) return
    setSubiendo(true)
    await subirDocumento({ trabajadorId:trabajador.id, contratoId:contrato.id,
      docTipoId:modalDoc.id, archivo, fechaVenc:fechaVenc||null, uid })
    setModalDoc(null); setArchivo(null); setFechaVenc(''); setSubiendo(false); cargar()
  }

  const eliminar = async (docCargado) => {
    if (!confirm('¿Eliminar este documento?')) return
    await eliminarDocumento(docCargado.id, docCargado.publicId ?? null); cargar()
  }

  const crearDocIndividual = async () => {
    if (!nuevoDocIndivNombre.trim()) return
    await addDocTipoIndividual(contrato.id, trabajador.id, nuevoDocIndivNombre.trim(), nuevoDocIndivTipo, uid)
    setNuevoDocIndivNombre(''); setModalDocIndiv(false); cargar()
  }

  const quitarDocIndividual = async (tipo) => {
    if (!confirm(`¿Quitar el documento "${tipo.nombre}" de este trabajador?`)) return
    await toggleDocTipoIndividual(tipo.id, false); cargar()
  }

  if (loading) return <div style={{ padding:40, color:C.textMuted, textAlign:'center' }}>Cargando...</div>

  const permanentes = todosDocTipos.filter(d => d.tipo==='permanente')
  const conVenc     = todosDocTipos.filter(d => d.tipo==='con_vencimiento')

  // ─── CARD (móvil) ───────────────────────────────────────────────────────────
  const DocCard = ({ tipo }) => {
    const cargado = docsCargados.find(d => d.docTipoId===tipo.id)
    const status  = cargado ? cargado.estado : 'falta'
    return (
      <div style={{ background:'#fff', borderRadius:10, padding:12, border:`1px solid ${C.border}`, marginBottom:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
          <div style={{ flex:1, marginRight:8 }}>
            <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{tipo.nombre}</div>
            {tipo.es_individual
              ? <span style={{ background:'#dcfce7', color:'#166534', fontSize:10,
                  padding:'1px 5px', borderRadius:99, fontWeight:700 }}>INDIVIDUAL</span>
              : tipo.es_adicional && <span style={{ background:'#dbeafe', color:'#1d4ed8', fontSize:10,
                  padding:'1px 5px', borderRadius:99, fontWeight:700 }}>ADICIONAL</span>
            }
            {cargado?.fechaVenc && (
              <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>
                Vence: {new Date(cargado.fechaVenc).toLocaleDateString('es-CL')}
              </div>
            )}
          </div>
          <Badge status={status} />
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {cargado?.url && <a href={cargado.url} target="_blank" rel="noreferrer"><Btn size="sm" variant="ghost">👁 Ver</Btn></a>}
          <Btn size="sm" variant="ghost" onClick={() => setModalDoc(tipo)}>{cargado?'🔄 Reemplazar':'📎 Subir'}</Btn>
          {cargado && <Btn size="sm" variant="danger" onClick={() => eliminar(cargado)}>🗑</Btn>}
          {tipo.es_individual && <Btn size="sm" variant="ghost" onClick={() => quitarDocIndividual(tipo)}>× Quitar</Btn>}
        </div>
      </div>
    )
  }

  // ─── ROW (desktop) ──────────────────────────────────────────────────────────
  const DocRow = ({ tipo }) => {
    const cargado = docsCargados.find(d => d.docTipoId===tipo.id)
    const status  = cargado ? cargado.estado : 'falta'
    return (
      <tr style={{ borderBottom:`1px solid ${C.border}` }}>
        <td style={{ padding:'10px 14px', fontSize:13, color:C.text, fontWeight:500 }}>
          {tipo.nombre}
          {tipo.es_individual
            ? <span style={{ marginLeft:6, background:'#dcfce7', color:'#166534',
                fontSize:10, padding:'1px 5px', borderRadius:99, fontWeight:700 }}>INDIVIDUAL</span>
            : tipo.es_adicional && <span style={{ marginLeft:6, background:'#dbeafe', color:'#1d4ed8',
                fontSize:10, padding:'1px 5px', borderRadius:99, fontWeight:700 }}>ADICIONAL</span>
          }
        </td>
        <td style={{ padding:'10px 14px' }}><Badge status={status} /></td>
        <td style={{ padding:'10px 14px', fontSize:12, color:C.textMuted, whiteSpace:'nowrap' }}>
          {cargado?.fechaVenc ? new Date(cargado.fechaVenc).toLocaleDateString('es-CL') : '—'}
        </td>
        <td style={{ padding:'10px 14px' }}>
          <div style={{ display:'flex', gap:5 }}>
            {cargado?.url && <a href={cargado.url} target="_blank" rel="noreferrer"><Btn size="sm" variant="ghost">👁</Btn></a>}
            <Btn size="sm" variant="ghost" onClick={() => setModalDoc(tipo)}>{cargado?'🔄':'📎'}</Btn>
            {cargado && <Btn size="sm" variant="danger" onClick={() => eliminar(cargado)}>🗑</Btn>}
            {tipo.es_individual && <Btn size="sm" variant="ghost" onClick={() => quitarDocIndividual(tipo)}>×</Btn>}
          </div>
        </td>
      </tr>
    )
  }

  // ─── SECCIÓN ────────────────────────────────────────────────────────────────
  const Seccion = ({ titulo, items }) => (
    <div style={{ background:'#fff', borderRadius:12, overflow:'hidden',
      border:`1px solid ${C.border}`, marginBottom:12 }}>
      <div style={{ padding:'10px 14px', background:'#f8fafc', borderBottom:`1px solid ${C.border}`,
        fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em' }}>
        {titulo} ({items.length})
      </div>
      {isMobile
        ? <div style={{ padding:8 }}>{items.map(t => <DocCard key={t.id} tipo={t} />)}</div>
        : <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:480 }}>
              <thead><tr style={{ background:'#f8fafc' }}>
                {['Documento','Estado','Vence','Acciones'].map(h => (
                  <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:11,
                    fontWeight:700, color:C.textMuted, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{items.map(t => <DocRow key={t.id} tipo={t} />)}</tbody>
            </table>
          </div>
      }
    </div>
  )

  return (
    <div style={{ padding:isMobile?12:28, overflowY:'auto', flex:1 }}>
      {!isMobile && (
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <Btn variant="ghost" size="sm" onClick={onBack}>← Volver</Btn>
          <div style={{ flex:1 }}>
            <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:C.text }}>
              {trabajador.nombres} {trabajador.apellidos}
            </h2>
            <div style={{ fontSize:13, color:C.textMuted }}>{trabajador.cargo} · {trabajador.rut} · {contrato.id}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:28, fontWeight:900, color:pct>=90?C.green:pct>=70?C.amber:C.red }}>{pct}%</div>
            <div style={{ fontSize:12, color:C.textMuted }}>{ok}/{total} docs</div>
          </div>
        </div>
      )}

      {isMobile && (
        <div style={{ background:'#fff', borderRadius:12, padding:14, marginBottom:12,
          border:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:C.text }}>
                {trabajador.nombres} {trabajador.apellidos}
              </div>
              <div style={{ fontSize:12, color:C.textMuted }}>{trabajador.cargo} · {trabajador.rut}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:22, fontWeight:900, color:pct>=90?C.green:pct>=70?C.amber:C.red }}>{pct}%</div>
              <div style={{ fontSize:11, color:C.textMuted }}>{ok}/{total}</div>
            </div>
          </div>
          <ProgressBar pct={pct} />
        </div>
      )}

      {!isMobile && <div style={{ marginBottom:16 }}><ProgressBar pct={pct} /></div>}

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
        <Btn size="sm" variant="ghost" onClick={() => setModalDocIndiv(true)}>+ Doc. individual</Btn>
      </div>

      <Seccion titulo="Documentos permanentes" items={permanentes} />
      <Seccion titulo="Con vencimiento" items={conVenc} />

      {modalDoc && (
        <Modal title={`Subir: ${modalDoc.nombre}`} onClose={() => { setModalDoc(null); setArchivo(null); setFechaVenc('') }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.textMuted,
              marginBottom:6, textTransform:'uppercase' }}>Archivo (PDF, JPG, PNG)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e=>setArchivo(e.target.files[0])} style={{ fontSize:14, width:'100%' }} />
          </div>
          {modalDoc.tipo==='con_vencimiento' && (
            <Input label="Fecha de vencimiento" type="date" value={fechaVenc} onChange={e=>setFechaVenc(e.target.value)} />
          )}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
            <Btn variant="ghost" onClick={() => { setModalDoc(null); setArchivo(null); setFechaVenc('') }}>Cancelar</Btn>
            <Btn onClick={subirDoc} disabled={!archivo||subiendo}>{subiendo?'Subiendo...':'📤 Subir'}</Btn>
          </div>
        </Modal>
      )}

      {modalDocIndiv && (
        <Modal title="Agregar documento individual" onClose={() => { setModalDocIndiv(false); setNuevoDocIndivNombre('') }}>
          <p style={{ fontSize:13, color:C.textMuted, marginTop:0 }}>
            Solo se asignará a <strong>{trabajador.nombres} {trabajador.apellidos}</strong>.
          </p>
          <Input label="Nombre del documento" value={nuevoDocIndivNombre}
            onChange={e=>setNuevoDocIndivNombre(e.target.value)}
            placeholder="Ej: Reinducción seguridad, Curso manejo defensivo..." />
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.textMuted,
              marginBottom:4, textTransform:'uppercase' }}>Tipo</label>
            <select value={nuevoDocIndivTipo} onChange={e=>setNuevoDocIndivTipo(e.target.value)}
              style={{ width:'100%', padding:'10px 12px', border:`1px solid ${C.border}`,
                borderRadius:8, fontSize:16, fontFamily:'inherit', background:'#fff' }}>
              <option value="con_vencimiento">Con vencimiento</option>
              <option value="permanente">Permanente</option>
            </select>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setModalDocIndiv(false); setNuevoDocIndivNombre('') }}>Cancelar</Btn>
            <Btn onClick={crearDocIndividual}>Agregar</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
