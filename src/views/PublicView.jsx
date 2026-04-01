import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import { C, DOCS_RESTRINGIDOS_PUBLICO, codeOf } from '../constants'
import { Badge, ProgressBar } from '../components/ui'
import {
  getContratos, getTrabajadores, getDocTipos, getDocTiposIndividuales,
  getDocsCargados, getDocsCargadosPorContrato, calcularCumplimiento,
} from '../firebase/service'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const esRestringido = (nombre) =>
  DOCS_RESTRINGIDOS_PUBLICO.some(r => r.toLowerCase() === nombre?.toLowerCase())

// ─── MODAL DE LOGIN ───────────────────────────────────────────────────────────
const LoginModal = ({ onClose }) => {
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setErr('')
    try {
      await signInWithEmailAndPassword(auth, email, pass)
      // Al autenticarse, App.jsx detecta el cambio y renderiza el panel admin.
      // El modal se cierra automáticamente porque PublicView deja de renderizarse.
    } catch {
      setErr('Correo o contraseña incorrectos')
      setLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth:360,
        boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:C.text }}>Acceso prevencionistas</div>
            <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>Panel de administración DocSICE</div>
          </div>
          <button onClick={onClose}
            style={{ background:'none', border:'none', cursor:'pointer',
              fontSize:22, color:C.textMuted, lineHeight:1 }}>×</button>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.textMuted,
              marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>Correo</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="admin@sice.cl" required autoFocus
              style={{ width:'100%', padding:'10px 12px', border:`1px solid ${C.border}`,
                borderRadius:8, fontSize:15, fontFamily:'inherit', outline:'none',
                boxSizing:'border-box', color:C.text }} />
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.textMuted,
              marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>Contraseña</label>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
              placeholder="••••••••" required
              style={{ width:'100%', padding:'10px 12px', border:`1px solid ${C.border}`,
                borderRadius:8, fontSize:15, fontFamily:'inherit', outline:'none',
                boxSizing:'border-box', color:C.text }} />
          </div>
          {err && (
            <div style={{ background:'#fef2f2', border:`1px solid #fecaca`, borderRadius:8,
              padding:'8px 12px', fontSize:13, color:'#991b1b', marginBottom:14 }}>
              {err}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:12, background:C.blue, color:'#fff', border:'none',
              borderRadius:8, fontSize:15, fontWeight:700, fontFamily:'inherit',
              cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1 }}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── BANNER ───────────────────────────────────────────────────────────────────
const BannerPublico = ({ onLoginClick, isMobile }) => (
  <div style={{ background:'#1e3a5f', padding: isMobile ? '10px 12px' : '10px 20px',
    display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexShrink:0 }}>
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:18 }}>🗂️</span>
      <div>
        <span style={{ fontSize:14, fontWeight:800, color:'#fff' }}>DocSICE</span>
        {!isMobile && <span style={{ fontSize:12, color:'#94a3b8', marginLeft:8 }}>SICE Agencia Chile</span>}
      </div>
    </div>
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      {!isMobile && (
        <span style={{ background:'rgba(255,255,255,0.08)', color:'#94a3b8', fontSize:11,
          fontWeight:700, padding:'4px 10px', borderRadius:99, whiteSpace:'nowrap' }}>
          👁 Solo lectura
        </span>
      )}
      <button onClick={onLoginClick}
        style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)',
          color:'#fff', fontSize:12, fontWeight:600,
          padding: isMobile ? '10px 14px' : '5px 12px',
          minHeight: isMobile ? 40 : 'auto',
          borderRadius:8, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
          transition:'background 0.15s' }}
        onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'}
        onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}>
        🔐 Iniciar sesión
      </button>
    </div>
  </div>
)

// ─── VISTA LISTA DE CONTRATOS ─────────────────────────────────────────────────
const ContratosList = ({ contratos, statsMap, onSelect, isMobile }) => (
  <div style={{ padding:isMobile?12:28, overflowY:'auto', flex:1 }}>
    <h2 style={{ margin:'0 0 6px', fontSize:isMobile?17:20, fontWeight:800, color:C.text }}>
      Contratos
    </h2>
    <p style={{ margin:'0 0 20px', fontSize:13, color:C.textMuted }}>
      Selecciona un contrato para ver el estado documental de los trabajadores.
    </p>

    <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(2,1fr)', gap:12 }}>
      {contratos.map(c => {
        const s = statsMap[c.id] || {}
        return (
          <div key={c.id} onClick={() => onSelect(c)}
            style={{ background:'#fff', borderRadius:14, padding:20, cursor:'pointer',
              borderTop:`4px solid ${c.color}`, border:`1px solid ${C.border}`,
              borderTopWidth:4, borderTopColor:c.color,
              transition:'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
              <div style={{ flex:1, minWidth:0, marginRight:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:c.color, marginBottom:3 }}>{codeOf(c)}</div>
                <div style={{ fontSize:14, fontWeight:700, color:C.text, lineHeight:1.3 }}>{c.nombre}</div>
                <div style={{ fontSize:12, color:C.textMuted, marginTop:3 }}>Código: {c.codigo}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:26, fontWeight:900,
                  color:(s.pct||0)>=90?C.green:(s.pct||0)>=70?C.amber:C.red }}>
                  {s.pct||0}%
                </div>
                <div style={{ fontSize:11, color:C.textMuted }}>cumplimiento</div>
              </div>
            </div>
            <ProgressBar pct={s.pct||0} />
            <div style={{ display:'flex', gap:16, marginTop:12, paddingTop:12,
              borderTop:`1px solid ${C.border}` }}>
              <span style={{ fontSize:12, color:C.textMuted }}>
                👥 {s.totalTrabajadores||0} trabajadores
              </span>
              {(s.alertasCount||0) > 0 && (
                <span style={{ fontSize:12, color:C.red, fontWeight:600 }}>
                  ⚠️ {s.alertasCount} alertas
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  </div>
)

// ─── VISTA TRABAJADORES DE UN CONTRATO ────────────────────────────────────────
const TrabajadoresList = ({ contrato, onBack, onSelectTrabajador, isMobile }) => {
  const [trabajadores, setTrabajadores] = useState([])
  const [docTipos, setDocTipos]         = useState([])
  const [docsCargados, setDocsCargados] = useState([])
  const [loading, setLoading]           = useState(true)
  const [filtro, setFiltro]             = useState('')

  useEffect(() => {
    Promise.all([
      getTrabajadores(contrato.id),
      getDocTipos(contrato.id),
      getDocsCargadosPorContrato(contrato.id),
    ]).then(([t, dt, dc]) => {
      setTrabajadores(t)
      // Filtrar tipos restringidos para el cálculo de cumplimiento público
      setDocTipos(dt.filter(d => !esRestringido(d.nombre)))
      setDocsCargados(dc)
      setLoading(false)
    })
  }, [contrato.id])

  const conStats = trabajadores.map(t => {
    const dc = docsCargados.filter(d => d.trabajadorId === t.id)
    const { pct, ok, total } = calcularCumplimiento(docTipos, dc)
    const alertas = dc.filter(d => d.estado==='vencido'||d.estado==='proximo').length
    return { ...t, pct, ok, total, alertas }
  })

  const filtrados = conStats
    .filter(t => `${t.nombres} ${t.apellidos} ${t.rut}`.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a,b) => `${a.nombres}${a.apellidos}`.localeCompare(`${b.nombres}${b.apellidos}`))

  if (loading) return <div style={{ padding:40, color:C.textMuted, textAlign:'center' }}>Cargando...</div>

  return (
    <div style={{ padding:isMobile?12:28, overflowY:'auto', flex:1 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={onBack}
          style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8,
            padding:'6px 12px', cursor:'pointer', fontSize:13, color:C.textMuted,
            fontFamily:'inherit', fontWeight:600 }}>
          ← Volver
        </button>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:contrato.color }}>{codeOf(contrato)}</div>
          <div style={{ fontSize:15, fontWeight:800, color:C.text }}>{contrato.nombre}</div>
        </div>
      </div>

      <input value={filtro} onChange={e=>setFiltro(e.target.value)}
        placeholder="Buscar trabajador..."
        style={{ width:'100%', padding:'10px 14px', border:`1px solid ${C.border}`,
          borderRadius:8, fontSize:16, fontFamily:'inherit', outline:'none',
          boxSizing:'border-box', marginBottom:12 }} />

      {isMobile ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtrados.map(t => (
            <div key={t.id} onClick={() => onSelectTrabajador(t, docTipos, docsCargados.filter(d=>d.trabajadorId===t.id))}
              style={{ background:'#fff', borderRadius:12, padding:14,
                border:`1px solid ${C.border}`, cursor:'pointer' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>
                    {t.nombres} {t.apellidos}
                  </div>
                  <div style={{ fontSize:12, color:C.textMuted }}>{t.cargo}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:18, fontWeight:800,
                    color:t.pct>=90?C.green:t.pct>=70?C.amber:C.red }}>{t.pct}%</div>
                  {t.alertas>0 && (
                    <span style={{ color:C.red, fontSize:11, fontWeight:600 }}>⚠️ {t.alertas}</span>
                  )}
                </div>
              </div>
              <ProgressBar pct={t.pct} />
              <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>{t.ok}/{t.total} docs</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:`1px solid ${C.border}` }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['RUT','Nombre','Cargo','Cumplimiento','Alertas'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11,
                    fontWeight:700, color:C.textMuted, textTransform:'uppercase',
                    borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length===0 && (
                <tr><td colSpan={5} style={{ padding:28, textAlign:'center', color:C.textMuted, fontSize:13 }}>
                  Sin resultados.
                </td></tr>
              )}
              {filtrados.map(t => (
                <tr key={t.id}
                  onClick={() => onSelectTrabajador(t, docTipos, docsCargados.filter(d=>d.trabajadorId===t.id))}
                  style={{ cursor:'pointer', borderBottom:`1px solid ${C.border}` }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'12px 16px', fontSize:13, color:C.textMuted }}>{t.rut}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:C.text }}>
                    {t.nombres} {t.apellidos}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:C.textMuted }}>{t.cargo}</td>
                  <td style={{ padding:'12px 16px', minWidth:140 }}>
                    <ProgressBar pct={t.pct} />
                    <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{t.ok}/{t.total}</div>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    {t.alertas>0
                      ? <span style={{ background:C.redLight, color:'#991b1b', borderRadius:99,
                          padding:'2px 8px', fontSize:12, fontWeight:700 }}>⚠️ {t.alertas}</span>
                      : <span style={{ color:C.green, fontSize:12 }}>✓</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── VISTA DOCUMENTOS DE UN TRABAJADOR (SOLO LECTURA) ────────────────────────
const DocumentosTrabajador = ({ trabajador, contrato, docTiposContrato, docsCargadosContrato, onBack, isMobile }) => {
  const [docTiposIndiv, setDocTiposIndiv] = useState([])
  const [docsCargados, setDocsCargados]   = useState([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    Promise.all([
      getDocTiposIndividuales(trabajador.id),
      getDocsCargados(trabajador.id),
    ]).then(([dtIndiv, dc]) => {
      setDocTiposIndiv(dtIndiv.filter(d => !esRestringido(d.nombre)))
      setDocsCargados(dc)
      setLoading(false)
    })
  }, [trabajador.id])

  if (loading) return <div style={{ padding:40, color:C.textMuted, textAlign:'center' }}>Cargando...</div>

  const todosDocTipos = [
    ...docTiposContrato.filter(d => !esRestringido(d.nombre)),
    ...docTiposIndiv,
  ]
  const { pct, ok, total } = calcularCumplimiento(todosDocTipos, docsCargados)
  const permanentes = todosDocTipos.filter(d => d.tipo==='permanente')
  const conVenc     = todosDocTipos.filter(d => d.tipo==='con_vencimiento')

  const Seccion = ({ titulo, items }) => (
    <div style={{ background:'#fff', borderRadius:12, overflow:'hidden',
      border:`1px solid ${C.border}`, marginBottom:12 }}>
      <div style={{ padding:'10px 16px', background:'#f8fafc', borderBottom:`1px solid ${C.border}`,
        fontSize:12, fontWeight:700, color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em' }}>
        {titulo} ({items.length})
      </div>
      {isMobile
        ? <div style={{ padding:8 }}>
            {items.map(tipo => {
              const cargado = docsCargados.find(d => d.docTipoId===tipo.id)
              const status  = cargado ? cargado.estado : 'falta'
              return (
                <div key={tipo.id} style={{ background:'#fff', borderRadius:10, padding:12,
                  border:`1px solid ${C.border}`, marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div style={{ flex:1, marginRight:8 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{tipo.nombre}</div>
                      {tipo.es_individual && (
                        <span style={{ background:'#dcfce7', color:'#166534', fontSize:10,
                          padding:'1px 5px', borderRadius:99, fontWeight:700 }}>INDIVIDUAL</span>
                      )}
                      {cargado?.fechaVenc && (
                        <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>
                          Vence: {new Date(cargado.fechaVenc).toLocaleDateString('es-CL')}
                        </div>
                      )}
                    </div>
                    <Badge status={status} />
                  </div>
                  {cargado?.url && (
                    <a href={cargado.url} target="_blank" rel="noreferrer"
                      style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 10px',
                        background:'#f8fafc', border:`1px solid ${C.border}`, borderRadius:8,
                        fontSize:12, fontWeight:600, color:C.textMuted, textDecoration:'none' }}>
                      👁 Ver documento
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        : <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:480 }}>
              <thead><tr style={{ background:'#f8fafc' }}>
                {['Documento','Estado','Vence',''].map(h => (
                  <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11,
                    fontWeight:700, color:C.textMuted, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {items.map(tipo => {
                  const cargado = docsCargados.find(d => d.docTipoId===tipo.id)
                  const status  = cargado ? cargado.estado : 'falta'
                  return (
                    <tr key={tipo.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:'10px 16px', fontSize:13, fontWeight:500, color:C.text }}>
                        {tipo.nombre}
                        {tipo.es_individual && (
                          <span style={{ marginLeft:6, background:'#dcfce7', color:'#166534',
                            fontSize:10, padding:'1px 5px', borderRadius:99, fontWeight:700 }}>INDIVIDUAL</span>
                        )}
                      </td>
                      <td style={{ padding:'10px 16px' }}><Badge status={status} /></td>
                      <td style={{ padding:'10px 16px', fontSize:12, color:C.textMuted }}>
                        {cargado?.fechaVenc ? new Date(cargado.fechaVenc).toLocaleDateString('es-CL') : '—'}
                      </td>
                      <td style={{ padding:'10px 16px' }}>
                        {cargado?.url && (
                          <a href={cargado.url} target="_blank" rel="noreferrer"
                            style={{ display:'inline-flex', alignItems:'center', gap:4,
                              padding:'4px 10px', background:'#f8fafc', border:`1px solid ${C.border}`,
                              borderRadius:6, fontSize:12, fontWeight:600, color:C.textMuted,
                              textDecoration:'none' }}>
                            👁 Ver
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
      }
    </div>
  )

  return (
    <div style={{ padding:isMobile?12:28, overflowY:'auto', flex:1 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={onBack}
          style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:8,
            padding:'6px 12px', cursor:'pointer', fontSize:13, color:C.textMuted,
            fontFamily:'inherit', fontWeight:600 }}>
          ← Volver
        </button>
        <div style={{ flex:1 }}>
          <h2 style={{ margin:0, fontSize:isMobile?15:18, fontWeight:800, color:C.text }}>
            {trabajador.nombres} {trabajador.apellidos}
          </h2>
          <div style={{ fontSize:12, color:C.textMuted }}>{trabajador.cargo} · {trabajador.rut} · {codeOf(contrato)}</div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:isMobile?20:28, fontWeight:900,
            color:pct>=90?C.green:pct>=70?C.amber:C.red }}>{pct}%</div>
          <div style={{ fontSize:11, color:C.textMuted }}>{ok}/{total} docs</div>
        </div>
      </div>

      <div style={{ marginBottom:16 }}><ProgressBar pct={pct} /></div>

      <Seccion titulo="Documentos permanentes" items={permanentes} />
      <Seccion titulo="Con vencimiento"         items={conVenc} />
    </div>
  )
}

// ─── COMPONENTE RAÍZ DE VISTA PÚBLICA ────────────────────────────────────────
export const PublicView = ({ isMobile, showLogin, onLoginClick, onLoginClose }) => {
  const [contratos, setContratos]         = useState([])
  const [statsMap, setStatsMap]           = useState({})
  const [loadingInicial, setLoadingInicial] = useState(true)

  // Estado de navegación interno
  const [contratoActivo, setContratoActivo]       = useState(null)
  const [trabajadorActivo, setTrabajadorActivo]   = useState(null)
  const [docTiposActivos, setDocTiposActivos]     = useState([])
  const [docsCargadosActivos, setDocsCargadosActivos] = useState([])

  useEffect(() => {
    // isAdmin=true → la vista pública muestra contratos de TODOS los prevencionistas
    getContratos(null, true).then(async (data) => {
      setContratos(data)
      // Calcular stats globales para la lista de contratos
      const map = {}
      for (const c of data) {
        try {
          const [trabajadores, docTipos, docsCargados] = await Promise.all([
            getTrabajadores(c.id),
            getDocTipos(c.id),
            getDocsCargadosPorContrato(c.id),
          ])
          // Excluir docs restringidos del cálculo de cumplimiento público
          const tiposPublicos = docTipos.filter(d => !esRestringido(d.nombre))
          const tw = trabajadores.map(t => {
            const dc = docsCargados.filter(d => d.trabajadorId===t.id)
            const { pct } = calcularCumplimiento(tiposPublicos, dc)
            return { ...t, pct }
          })
          const pct = tw.length ? Math.round(tw.reduce((s,t)=>s+t.pct,0)/tw.length) : 0
          const alertas = docsCargados.filter(d =>
            !esRestringido(docTipos.find(dt=>dt.id===d.docTipoId)?.nombre) &&
            (d.estado==='vencido'||d.estado==='proximo')
          )
          map[c.id] = {
            pct,
            totalTrabajadores: trabajadores.length,
            alertasCount: alertas.length,
          }
        } catch {
          map[c.id] = { pct:0, totalTrabajadores:0, alertasCount:0 }
        }
      }
      setStatsMap(map)
      setLoadingInicial(false)
    })
  }, [])

  if (loadingInicial) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <BannerPublico onLoginClick={onLoginClick} isMobile={isMobile} />
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:14, color:C.textMuted }}>Cargando datos...</div>
    </div>
  )

  const handleSelectContrato = (c) => {
    setContratoActivo(c)
    setTrabajadorActivo(null)
    setDocTiposActivos([])
    setDocsCargadosActivos([])
  }

  const handleSelectTrabajador = (t, docTipos, docsCargados) => {
    setTrabajadorActivo(t)
    setDocTiposActivos(docTipos)
    setDocsCargadosActivos(docsCargados)
  }

  const handleVolverAContratos = () => {
    setContratoActivo(null)
    setTrabajadorActivo(null)
  }

  const handleVolverATrabajadores = () => {
    setTrabajadorActivo(null)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh',
      fontFamily:"'Inter',system-ui,sans-serif", background:C.bg }}>
      <BannerPublico onLoginClick={onLoginClick} isMobile={isMobile} />
      {showLogin && <LoginModal onClose={onLoginClose} />}

      <main style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {!contratoActivo && (
          <ContratosList
            contratos={contratos}
            statsMap={statsMap}
            onSelect={handleSelectContrato}
            isMobile={isMobile}
          />
        )}

        {contratoActivo && !trabajadorActivo && (
          <TrabajadoresList
            contrato={contratoActivo}
            onBack={handleVolverAContratos}
            onSelectTrabajador={handleSelectTrabajador}
            isMobile={isMobile}
          />
        )}

        {contratoActivo && trabajadorActivo && (
          <DocumentosTrabajador
            trabajador={trabajadorActivo}
            contrato={contratoActivo}
            docTiposContrato={docTiposActivos}
            docsCargadosContrato={docsCargadosActivos}
            onBack={handleVolverATrabajadores}
            isMobile={isMobile}
          />
        )}
      </main>
    </div>
  )
}
