import { useState, useEffect, useCallback } from 'react'
import { C } from '../constants'
import { Btn, Modal, Input, ProgressBar } from '../components/ui'
import {
  getTrabajadores, getDocTipos, getDocsCargadosPorContrato, getTrabajadoresDesvinculados,
  addDocTipo, toggleDocTipo,
  addTrabajador, editarTrabajador, desactivarTrabajador, desvincularTrabajador,
  importarTrabajadoresCSV, calcularCumplimiento,
} from '../firebase/service'

export const ContratoView = ({ contrato, onSelectTrabajador, isMobile, uid, isAdmin }) => {
  const [trabajadores, setTrabajadores]           = useState([])
  const [docTipos, setDocTipos]                   = useState([])
  const [docsCargados, setDocsCargados]           = useState([])
  const [loading, setLoading]                     = useState(true)
  const [modalNuevoDoc, setModalNuevoDoc]         = useState(false)
  const [modalNuevoTrab, setModalNuevoTrab]       = useState(false)
  const [modalImport, setModalImport]             = useState(false)
  const [nuevoDocNombre, setNuevoDocNombre]       = useState('')
  const [nuevoDocTipo, setNuevoDocTipo]           = useState('con_vencimiento')
  const [filtro, setFiltro]                       = useState('')
  const [ordenar, setOrdenar]                     = useState('nombre')
  const [nuevoTrab, setNuevoTrab]                 = useState({ rut:'', nombres:'', apellidos:'', cargo:'' })
  const [csvText, setCsvText]                     = useState('')
  const [modalEditarTrab, setModalEditarTrab]     = useState(false)
  const [trabEditar, setTrabEditar]               = useState({ id:'', rut:'', nombres:'', apellidos:'', cargo:'' })
  const [desvinculados, setDesvinculados]         = useState([])
  const [mostrarDesvinculados, setMostrarDesvinculados] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [t, dt, dc, desv] = await Promise.all([
      getTrabajadores(contrato.id), getDocTipos(contrato.id),
      getDocsCargadosPorContrato(contrato.id), getTrabajadoresDesvinculados(contrato.id),
    ])
    setTrabajadores(t); setDocTipos(dt); setDocsCargados(dc); setDesvinculados(desv); setLoading(false)
  }, [contrato.id])

  useEffect(() => { cargar() }, [cargar])

  const addDocAdicional = async () => {
    if (!nuevoDocNombre.trim()) return
    await addDocTipo(contrato.id, nuevoDocNombre.trim(), nuevoDocTipo, uid)
    setNuevoDocNombre(''); setModalNuevoDoc(false); cargar()
  }

  const crearTrabajador = async () => {
    if (!nuevoTrab.rut || !nuevoTrab.nombres) return
    await addTrabajador({ ...nuevoTrab, contratoId: contrato.id }, uid)
    setNuevoTrab({ rut:'', nombres:'', apellidos:'', cargo:'' })
    setModalNuevoTrab(false); cargar()
  }

  const importarCSV = async () => {
    if (!csvText.trim()) return
    const count = await importarTrabajadoresCSV(contrato.id, csvText, uid)
    alert(`✅ ${count} trabajadores importados`)
    setModalImport(false); setCsvText(''); cargar()
  }

  const abrirEditarTrab = (t, e) => {
    e.stopPropagation()
    setTrabEditar({ id:t.id, rut:t.rut, nombres:t.nombres, apellidos:t.apellidos, cargo:t.cargo })
    setModalEditarTrab(true)
  }

  const guardarEdicionTrab = async () => {
    if (!trabEditar.rut || !trabEditar.nombres) return
    await editarTrabajador(trabEditar.id, {
      rut: trabEditar.rut, nombres: trabEditar.nombres,
      apellidos: trabEditar.apellidos, cargo: trabEditar.cargo,
    })
    setModalEditarTrab(false); cargar()
  }

  const desvincularHandler = async (t, e) => {
    e.stopPropagation()
    if (!confirm(`¿Desvincular a ${t.nombres} ${t.apellidos}?\nPasará al apartado de desvinculados.`)) return
    await desvincularTrabajador(t.id); cargar()
  }

  const eliminarTrabHandler = async (t, e) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar definitivamente a ${t.nombres} ${t.apellidos}?`)) return
    await desactivarTrabajador(t.id); cargar()
  }

  const conStats = trabajadores.map(t => {
    const dc = docsCargados.filter(d => d.trabajadorId === t.id)
    const { pct, ok, total } = calcularCumplimiento(docTipos, dc)
    const alertas = dc.filter(d => d.estado==='vencido'||d.estado==='proximo').length
    return { ...t, pct, ok, total, alertas }
  })

  const filtrados = conStats
    .filter(t => `${t.nombres} ${t.apellidos} ${t.rut}`.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a,b) => ordenar==='pct' ? a.pct-b.pct : `${a.nombres}${a.apellidos}`.localeCompare(`${b.nombres}${b.apellidos}`))

  const pctContrato = conStats.length
    ? Math.round(conStats.reduce((s,t)=>s+t.pct,0)/conStats.length) : 0

  if (loading) return <div style={{ padding:40, color:C.textMuted, textAlign:'center' }}>Cargando...</div>

  return (
    <div style={{ padding:isMobile?12:28, overflowY:'auto', flex:1 }}>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:700, color:contrato.color, marginBottom:3 }}>
          {contrato.id} · {contrato.codigo}
        </div>
        <div style={{ fontSize:isMobile?15:18, fontWeight:800, color:C.text, marginBottom:10 }}>
          {contrato.nombre}
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          <Btn variant="ghost" size="sm" onClick={() => setModalImport(true)}>📥 CSV</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setModalNuevoTrab(true)}>+ Trabajador</Btn>
          <Btn size="sm" onClick={() => setModalNuevoDoc(true)}>+ Doc adicional</Btn>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
        {[
          { label:'Cumplimiento', val:`${pctContrato}%`, color:pctContrato>=90?C.green:pctContrato>=70?C.amber:C.red },
          { label:'Trabajadores', val:trabajadores.length, color:C.blue },
          { label:'Tipos de doc.', val:docTipos.length, color:C.purple },
          { label:'Alertas', val:conStats.reduce((s,t)=>s+t.alertas,0), color:C.red },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', borderRadius:10, padding:12 }}>
            <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{k.val}</div>
            <div style={{ fontSize:11, color:C.textMuted }}>{k.label}</div>
          </div>
        ))}
      </div>

      {docTipos.filter(d=>d.es_adicional).length > 0 && (
        <div style={{ background:'#eff6ff', borderRadius:10, padding:12, marginBottom:12,
          border:`1px solid #bfdbfe` }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#1d4ed8', marginBottom:6 }}>
            📌 Documentos adicionales
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {docTipos.filter(d=>d.es_adicional).map(d => (
              <span key={d.id} style={{ background:'#dbeafe', borderRadius:99, padding:'3px 10px',
                fontSize:12, color:'#1e40af', display:'flex', alignItems:'center', gap:6 }}>
                {d.nombre}
                <span onClick={() => { toggleDocTipo(d.id, false); cargar() }}
                  style={{ cursor:'pointer', opacity:0.6, fontWeight:700 }}>×</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
        <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Buscar..."
          style={{ flex:1, padding:'9px 12px', border:`1px solid ${C.border}`, borderRadius:8,
            fontSize:16, fontFamily:'inherit', outline:'none' }} />
        <select value={ordenar} onChange={e=>setOrdenar(e.target.value)}
          style={{ padding:'9px 8px', border:`1px solid ${C.border}`, borderRadius:8,
            fontSize:13, fontFamily:'inherit', background:'#fff' }}>
          <option value="nombre">Nombre</option>
          <option value="pct">% cumpl.</option>
        </select>
      </div>

      {isMobile ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtrados.length===0 && (
            <div style={{ textAlign:'center', color:C.textMuted, padding:28, fontSize:13 }}>
              Sin trabajadores. Agrega uno arriba.
            </div>
          )}
          {filtrados.map(t => (
            <div key={t.id} style={{ background:'#fff', borderRadius:12, padding:14,
              border:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}
                onClick={() => onSelectTrabajador(t)}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>
                    {t.nombres} {t.apellidos}
                  </div>
                  <div style={{ fontSize:12, color:C.textMuted }}>{t.cargo} · {t.rut}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:16, fontWeight:800,
                    color:t.pct>=90?C.green:t.pct>=70?C.amber:C.red }}>{t.pct}%</div>
                  {t.alertas>0 && (
                    <span style={{ background:C.redLight, color:'#991b1b', borderRadius:99,
                      padding:'1px 7px', fontSize:11, fontWeight:700 }}>⚠️ {t.alertas}</span>
                  )}
                </div>
              </div>
              <ProgressBar pct={t.pct} />
              <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>{t.ok}/{t.total} docs</div>
              <div style={{ display:'flex', gap:6, marginTop:8, paddingTop:8,
                borderTop:`1px solid ${C.border}` }}>
                <Btn size="sm" variant="ghost" style={{ flex:1 }}
                  onClick={() => onSelectTrabajador(t)}>Ver →</Btn>
                <Btn size="sm" variant="ghost" onClick={e=>abrirEditarTrab(t,e)}>✏️</Btn>
                <Btn size="sm" variant="ghost" onClick={e=>desvincularHandler(t,e)}>🔗</Btn>
                <Btn size="sm" variant="danger" onClick={e=>eliminarTrabHandler(t,e)}>🗑</Btn>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:`1px solid ${C.border}` }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:500 }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['RUT','Nombre','Cargo','Cumplimiento','Alertas',''].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11,
                      fontWeight:700, color:C.textMuted, textTransform:'uppercase',
                      borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length===0 && (
                  <tr><td colSpan={6} style={{ padding:28, textAlign:'center', color:C.textMuted, fontSize:13 }}>
                    Sin trabajadores. Agrega uno con el botón de arriba.
                  </td></tr>
                )}
                {filtrados.map(t => (
                  <tr key={t.id} onClick={() => onSelectTrabajador(t)} style={{ cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.textMuted }}>{t.rut}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, fontWeight:600, color:C.text }}>
                      {t.nombres} {t.apellidos}
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.textMuted }}>{t.cargo}</td>
                    <td style={{ padding:'12px 14px', minWidth:140 }}>
                      <ProgressBar pct={t.pct} />
                      <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{t.ok}/{t.total}</div>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      {t.alertas>0
                        ? <span style={{ background:C.redLight, color:'#991b1b', borderRadius:99,
                            padding:'2px 8px', fontSize:12, fontWeight:700 }}>⚠️ {t.alertas}</span>
                        : <span style={{ color:C.green, fontSize:12 }}>✓</span>}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', gap:4 }}>
                        <Btn size="sm" variant="ghost" onClick={e=>{e.stopPropagation();onSelectTrabajador(t)}}>Ver →</Btn>
                        <Btn size="sm" variant="ghost" onClick={e=>abrirEditarTrab(t,e)}>✏️</Btn>
                        <Btn size="sm" variant="ghost" onClick={e=>desvincularHandler(t,e)}>🔗</Btn>
                        <Btn size="sm" variant="danger" onClick={e=>eliminarTrabHandler(t,e)}>🗑</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalNuevoDoc && (
        <Modal title="Agregar documento adicional" onClose={() => setModalNuevoDoc(false)}>
          <p style={{ fontSize:13, color:C.textMuted, marginTop:0 }}>
            Se asignará a <strong>todos</strong> los trabajadores del contrato {contrato.id}.
          </p>
          <Input label="Nombre del documento" value={nuevoDocNombre}
            onChange={e=>setNuevoDocNombre(e.target.value)} placeholder="Ej: Curso Manejo Defensivo" />
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.textMuted,
              marginBottom:4, textTransform:'uppercase' }}>Tipo</label>
            <select value={nuevoDocTipo} onChange={e=>setNuevoDocTipo(e.target.value)}
              style={{ width:'100%', padding:'10px 12px', border:`1px solid ${C.border}`,
                borderRadius:8, fontSize:16, fontFamily:'inherit', background:'#fff' }}>
              <option value="con_vencimiento">Con vencimiento</option>
              <option value="permanente">Permanente</option>
            </select>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModalNuevoDoc(false)}>Cancelar</Btn>
            <Btn onClick={addDocAdicional}>Agregar</Btn>
          </div>
        </Modal>
      )}

      {modalNuevoTrab && (
        <Modal title="Agregar trabajador" onClose={() => setModalNuevoTrab(false)}>
          <Input label="RUT" value={nuevoTrab.rut} onChange={e=>setNuevoTrab(p=>({...p,rut:e.target.value}))} placeholder="12345678-9" />
          <Input label="Nombres" value={nuevoTrab.nombres} onChange={e=>setNuevoTrab(p=>({...p,nombres:e.target.value}))} />
          <Input label="Apellidos" value={nuevoTrab.apellidos} onChange={e=>setNuevoTrab(p=>({...p,apellidos:e.target.value}))} />
          <Input label="Cargo" value={nuevoTrab.cargo} onChange={e=>setNuevoTrab(p=>({...p,cargo:e.target.value}))} />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModalNuevoTrab(false)}>Cancelar</Btn>
            <Btn onClick={crearTrabajador}>Guardar</Btn>
          </div>
        </Modal>
      )}

      {modalImport && (
        <Modal title="Importar desde CSV" onClose={() => setModalImport(false)}>
          <p style={{ fontSize:13, color:C.textMuted, marginTop:0 }}>
            Formato: <code style={{ background:'#f1f5f9', padding:'1px 5px', borderRadius:4, fontSize:12 }}>rut,nombres,apellidos,cargo</code>
          </p>
          <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} rows={7}
            placeholder="rut,nombres,apellidos,cargo&#10;12345678-9,Juan,Pérez,Técnico"
            style={{ width:'100%', padding:'9px 12px', border:`1px solid ${C.border}`,
              borderRadius:8, fontSize:13, fontFamily:'monospace', resize:'vertical', boxSizing:'border-box' }} />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:10 }}>
            <Btn variant="ghost" onClick={() => setModalImport(false)}>Cancelar</Btn>
            <Btn onClick={importarCSV}>Importar</Btn>
          </div>
        </Modal>
      )}

      {modalEditarTrab && (
        <Modal title="Editar trabajador" onClose={() => setModalEditarTrab(false)}>
          <Input label="RUT" value={trabEditar.rut}
            onChange={e=>setTrabEditar(p=>({...p,rut:e.target.value}))} />
          <Input label="Nombres" value={trabEditar.nombres}
            onChange={e=>setTrabEditar(p=>({...p,nombres:e.target.value}))} />
          <Input label="Apellidos" value={trabEditar.apellidos}
            onChange={e=>setTrabEditar(p=>({...p,apellidos:e.target.value}))} />
          <Input label="Cargo" value={trabEditar.cargo}
            onChange={e=>setTrabEditar(p=>({...p,cargo:e.target.value}))} />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModalEditarTrab(false)}>Cancelar</Btn>
            <Btn onClick={guardarEdicionTrab}>Guardar</Btn>
          </div>
        </Modal>
      )}

      {desvinculados.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div onClick={() => setMostrarDesvinculados(!mostrarDesvinculados)}
            style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:8,
              marginBottom:mostrarDesvinculados?10:0, userSelect:'none' }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.textMuted }}>
              🔗 Desvinculados ({desvinculados.length})
            </span>
            <span style={{ color:C.textMuted, fontSize:11 }}>{mostrarDesvinculados?'▲':'▼'}</span>
          </div>
          {mostrarDesvinculados && (
            <div style={{ background:'#fff', borderRadius:12, overflow:'hidden',
              border:`1px solid ${C.border}`, opacity:0.75 }}>
              {isMobile ? (
                desvinculados.map(t => (
                  <div key={t.id} style={{ padding:'10px 14px', borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.textMuted }}>
                      {t.nombres} {t.apellidos}
                    </div>
                    <div style={{ fontSize:12, color:C.textMuted }}>{t.cargo} · {t.rut}</div>
                  </div>
                ))
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <tbody>
                    {desvinculados.map(t => (
                      <tr key={t.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:'10px 14px', fontSize:13, color:C.textMuted }}>{t.rut}</td>
                        <td style={{ padding:'10px 14px', fontSize:13, color:C.textMuted }}>
                          {t.nombres} {t.apellidos}
                        </td>
                        <td style={{ padding:'10px 14px', fontSize:13, color:C.textMuted }}>{t.cargo}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ background:'#f1f5f9', color:C.textMuted, fontSize:11,
                            padding:'2px 8px', borderRadius:99, fontWeight:600 }}>Desvinculado</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
