import { useState, useEffect, useCallback } from 'react'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'
import {
  getContratos, getDocTipos, getTrabajadores, getDocsCargados,
  getDocsCargadosPorContrato, subirDocumento, eliminarDocumento,
  addDocTipo, toggleDocTipo, addTrabajador, desactivarTrabajador,
  importarTrabajadoresCSV, calcularCumplimiento, seedInicial
} from './firebase/service'

// ─── PALETA ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#f0f2f5', card: '#ffffff', sidebar: '#0f172a',
  sideText: '#94a3b8', sideActive: '#ffffff',
  blue: '#3b82f6', blueLight: '#eff6ff',
  red: '#ef4444', redLight: '#fef2f2',
  amber: '#f59e0b', amberLight: '#fffbeb',
  green: '#10b981', greenLight: '#ecfdf5',
  purple: '#8b5cf6',
  text: '#1e293b', textMuted: '#64748b', border: '#e2e8f0',
}

const STATUS_CONFIG = {
  ok:          { label: 'Vigente',       dot: C.green,  bg: C.greenLight, text: '#065f46' },
  proximo:     { label: 'Próx. vencer',  dot: C.amber,  bg: C.amberLight, text: '#92400e' },
  vencido:     { label: 'Vencido',       dot: C.red,    bg: C.redLight,   text: '#991b1b' },
  no_aplica:   { label: 'No aplica',     dot: '#94a3b8', bg: '#f8fafc',   text: '#475569' },
  falta:       { label: 'Sin cargar',    dot: '#d1d5db', bg: '#f9fafb',   text: '#6b7280' },
  restriccion: { label: 'Restricción',   dot: C.purple, bg: '#f5f3ff',    text: '#5b21b6' },
}

// ─── HELPERS UI ──────────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.falta
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 8px',
      borderRadius:99, background:cfg.bg, fontSize:11, fontWeight:600, color:cfg.text }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot, flexShrink:0 }} />
      {cfg.label}
    </span>
  )
}

const ProgressBar = ({ pct, color = C.blue }) => {
  const col = pct >= 90 ? C.green : pct >= 70 ? C.amber : C.red
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, borderRadius:99, background:'#e2e8f0', overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:99,
          transition:'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize:12, fontWeight:700, color:col, minWidth:32 }}>{pct}%</span>
    </div>
  )
}

const Btn = ({ onClick, children, variant='primary', size='md', disabled=false, style={} }) => {
  const base = { cursor: disabled ? 'not-allowed' : 'pointer', border:'none', borderRadius:8,
    fontFamily:'inherit', fontWeight:600, transition:'opacity 0.15s', opacity: disabled ? 0.5 : 1,
    fontSize: size === 'sm' ? 12 : 14, padding: size === 'sm' ? '5px 10px' : '9px 18px', ...style }
  const variants = {
    primary:  { background: C.blue,   color:'#fff' },
    danger:   { background: C.red,    color:'#fff' },
    ghost:    { background: 'transparent', color: C.textMuted, border:`1px solid ${C.border}` },
    success:  { background: C.green,  color:'#fff' },
  }
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}>{children}</button>
}

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex',
    alignItems:'center', justifyContent:'center', zIndex:1000 }}>
    <div style={{ background:'#fff', borderRadius:16, padding:28, width:460, maxWidth:'90vw',
      boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:C.text }}>{title}</h3>
        <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer',
          fontSize:20, color:C.textMuted, padding:'0 4px' }}>×</button>
      </div>
      {children}
    </div>
  </div>
)

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.textMuted,
      marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>}
    <input style={{ width:'100%', padding:'9px 12px', border:`1px solid ${C.border}`,
      borderRadius:8, fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box',
      color:C.text }} {...props} />
  </div>
)

// ─── LOGIN ───────────────────────────────────────────────────────────────────
const LoginView = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      await signInWithEmailAndPassword(auth, email, pass)
      onLogin()
    } catch {
      setErr('Credenciales incorrectas')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:40, width:380,
        boxShadow:'0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:C.blue, margin:'0 auto 12px',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🗂️</div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:C.text }}>DocSICE</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:C.textMuted }}>Control Documental · SICE Agencia Chile</p>
        </div>
        <form onSubmit={handleLogin}>
          <Input label="Correo" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@sice.cl" required />
          <Input label="Contraseña" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" required />
          {err && <p style={{ color:C.red, fontSize:13, marginBottom:10 }}>{err}</p>}
          <Btn onClick={() => {}} style={{ width:'100%', marginTop:4 }} disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Btn>
        </form>
      </div>
    </div>
  )
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const Sidebar = ({ view, contratoActivo, contratos, onNav, onLogout }) => {
  const navItems = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'alertas',   icon:'🔔', label:'Alertas' },
  ]

  return (
    <div style={{ width:220, background:C.sidebar, display:'flex', flexDirection:'column', flexShrink:0 }}>
      <div style={{ padding:'24px 20px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize:14, fontWeight:800, color:'#fff', letterSpacing:'0.05em' }}>DocSICE</div>
        <div style={{ fontSize:11, color:C.sideText, marginTop:2 }}>SICE Agencia Chile</div>
      </div>

      <nav style={{ padding:'12px 10px', flex:1, overflowY:'auto' }}>
        {navItems.map(item => (
          <div key={item.id} onClick={() => onNav(item.id, null)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8,
              cursor:'pointer', marginBottom:2, transition:'background 0.15s',
              background: view === item.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: view === item.id ? '#fff' : C.sideText, fontSize:13, fontWeight:500 }}>
            <span style={{ fontSize:15 }}>{item.icon}</span>{item.label}
          </div>
        ))}

        <div style={{ fontSize:10, fontWeight:700, color:'#475569', letterSpacing:'0.1em',
          textTransform:'uppercase', padding:'14px 10px 6px' }}>Contratos</div>

        {contratos.map(c => (
          <div key={c.id} onClick={() => onNav('contrato', c.id)}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8,
              cursor:'pointer', marginBottom:2, transition:'background 0.15s',
              background: contratoActivo === c.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: contratoActivo === c.id ? '#fff' : C.sideText, fontSize:12, fontWeight:500 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:c.color, flexShrink:0 }} />
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.id}</span>
          </div>
        ))}
      </nav>

      <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div onClick={onLogout} style={{ display:'flex', alignItems:'center', gap:10,
          padding:'9px 10px', borderRadius:8, cursor:'pointer', color:'#ef4444', fontSize:13 }}>
          🚪 Cerrar sesión
        </div>
      </div>
    </div>
  )
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
const DashboardView = ({ contratos, statsMap, onNav }) => {
  const allAlerts = Object.values(statsMap).flatMap(s => s.alertas || [])
  const vencidosHoy = allAlerts.filter(a => a.tipo === 'vencido')
  const proximos = allAlerts.filter(a => a.tipo === 'proximo')

  const globalPct = contratos.length
    ? Math.round(contratos.reduce((s, c) => s + (statsMap[c.id]?.pct || 0), 0) / contratos.length)
    : 0

  // Ranking peor cumplimiento (todos los trabajadores)
  const ranking = Object.values(statsMap)
    .flatMap(s => s.trabajadores || [])
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5)

  return (
    <div style={{ padding:28, overflowY:'auto', flex:1 }}>
      <h2 style={{ margin:'0 0 20px', fontSize:20, fontWeight:800, color:C.text }}>Dashboard general</h2>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Cumplimiento global', val:`${globalPct}%`, icon:'📈', color:C.blue },
          { label:'Vencidos hoy', val:vencidosHoy.length, icon:'🔴', color:C.red },
          { label:'Próximos 60 días', val:proximos.length, icon:'🟡', color:C.amber },
          { label:'Contratos activos', val:contratos.length, icon:'📋', color:C.green },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', borderRadius:14, padding:18,
            borderLeft:`4px solid ${k.color}` }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{k.icon}</div>
            <div style={{ fontSize:26, fontWeight:800, color:k.color }}>{k.val}</div>
            <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Cards por contrato */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14, marginBottom:24 }}>
        {contratos.map(c => {
          const s = statsMap[c.id] || {}
          return (
            <div key={c.id} onClick={() => onNav('contrato', c.id)} style={{ background:'#fff',
              borderRadius:14, padding:20, cursor:'pointer', transition:'box-shadow 0.15s',
              borderTop:`4px solid ${c.color}` }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:c.color }}>{c.id}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, marginTop:2,
                    maxWidth:220 }}>{c.nombre}</div>
                </div>
                <div style={{ fontSize:24, fontWeight:800, color:s.pct >= 90 ? C.green : s.pct >= 70 ? C.amber : C.red }}>
                  {s.pct || 0}%
                </div>
              </div>
              <ProgressBar pct={s.pct || 0} />
              <div style={{ display:'flex', gap:16, marginTop:12 }}>
                <span style={{ fontSize:12, color:C.textMuted }}>👥 {s.totalTrabajadores || 0} trabajadores</span>
                {(s.alertasCount || 0) > 0 && (
                  <span style={{ fontSize:12, color:C.red, fontWeight:600 }}>⚠️ {s.alertasCount} alertas</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Alertas vencidas hoy */}
        <div style={{ background:'#fff', borderRadius:14, padding:20 }}>
          <h3 style={{ margin:'0 0 14px', fontSize:14, fontWeight:700, color:C.text }}>
            🔴 Vencidos ({vencidosHoy.length})
          </h3>
          {vencidosHoy.length === 0
            ? <p style={{ color:C.textMuted, fontSize:13 }}>Sin vencimientos</p>
            : vencidosHoy.slice(0,5).map((a,i) => (
              <div key={i} style={{ padding:'8px 0', borderBottom:`1px solid ${C.border}`,
                fontSize:13 }}>
                <div style={{ fontWeight:600, color:C.text }}>{a.trabajador}</div>
                <div style={{ color:C.textMuted, fontSize:12 }}>{a.doc} · {a.contrato}</div>
              </div>
            ))
          }
        </div>

        {/* Ranking peor cumplimiento */}
        <div style={{ background:'#fff', borderRadius:14, padding:20 }}>
          <h3 style={{ margin:'0 0 14px', fontSize:14, fontWeight:700, color:C.text }}>
            📉 Menor cumplimiento
          </h3>
          {ranking.length === 0
            ? <p style={{ color:C.textMuted, fontSize:13 }}>Sin datos</p>
            : ranking.map((t,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0',
                borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:12, fontWeight:800, color:C.textMuted, minWidth:18 }}>{i+1}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{t.nombre}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{t.contratoId}</div>
                </div>
                <span style={{ fontSize:13, fontWeight:800,
                  color: t.pct >= 90 ? C.green : t.pct >= 70 ? C.amber : C.red }}>{t.pct}%</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ─── VISTA CONTRATO ───────────────────────────────────────────────────────────
const ContratoView = ({ contrato, onSelectTrabajador }) => {
  const [trabajadores, setTrabajadores] = useState([])
  const [docTipos, setDocTipos] = useState([])
  const [docsCargados, setDocsCargados] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalNuevoDoc, setModalNuevoDoc] = useState(false)
  const [modalNuevoTrabajador, setModalNuevoTrabajador] = useState(false)
  const [modalImport, setModalImport] = useState(false)
  const [nuevoDocNombre, setNuevoDocNombre] = useState('')
  const [nuevoDocTipo, setNuevoDocTipo] = useState('con_vencimiento')
  const [filtro, setFiltro] = useState('')
  const [ordenar, setOrdenar] = useState('nombre')
  const [nuevoTrab, setNuevoTrab] = useState({ rut:'', nombres:'', apellidos:'', cargo:'' })
  const [csvText, setCsvText] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    const [t, dt, dc] = await Promise.all([
      getTrabajadores(contrato.id),
      getDocTipos(contrato.id),
      getDocsCargadosPorContrato(contrato.id),
    ])
    setTrabajadores(t)
    setDocTipos(dt)
    setDocsCargados(dc)
    setLoading(false)
  }, [contrato.id])

  useEffect(() => { cargar() }, [cargar])

  const addDocAdicional = async () => {
    if (!nuevoDocNombre.trim()) return
    await addDocTipo(contrato.id, nuevoDocNombre.trim(), nuevoDocTipo)
    setNuevoDocNombre('')
    setModalNuevoDoc(false)
    cargar()
  }

  const crearTrabajador = async () => {
    if (!nuevoTrab.rut || !nuevoTrab.nombres) return
    await addTrabajador({ ...nuevoTrab, contratoId: contrato.id })
    setNuevoTrab({ rut:'', nombres:'', apellidos:'', cargo:'' })
    setModalNuevoTrabajador(false)
    cargar()
  }

  const importarCSV = async () => {
    if (!csvText.trim()) return
    const count = await importarTrabajadoresCSV(contrato.id, csvText)
    alert(`✅ ${count} trabajadores importados`)
    setModalImport(false)
    setCsvText('')
    cargar()
  }

  // Calcular cumplimiento por trabajador
  const trabajadoresConStats = trabajadores.map(t => {
    const docsT = docsCargados.filter(d => d.trabajadorId === t.id)
    const { pct, ok, total } = calcularCumplimiento(docTipos, docsT)
    const alertas = docsT.filter(d => d.estado === 'vencido' || d.estado === 'proximo').length
    return { ...t, pct, ok, total, alertas }
  })

  const filtrados = trabajadoresConStats
    .filter(t => `${t.nombres} ${t.apellidos} ${t.rut}`.toLowerCase().includes(filtro.toLowerCase()))
    .sort((a,b) => ordenar === 'pct' ? a.pct - b.pct : `${a.nombres}${a.apellidos}`.localeCompare(`${b.nombres}${b.apellidos}`))

  const pctContrato = trabajadoresConStats.length
    ? Math.round(trabajadoresConStats.reduce((s,t) => s+t.pct, 0) / trabajadoresConStats.length)
    : 0

  if (loading) return <div style={{ padding:40, color:C.textMuted }}>Cargando...</div>

  return (
    <div style={{ padding:28, overflowY:'auto', flex:1 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:contrato.color, marginBottom:4 }}>
            {contrato.id} · {contrato.codigo}
          </div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:C.text }}>{contrato.nombre}</h2>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn variant="ghost" size="sm" onClick={() => setModalImport(true)}>📥 Importar CSV</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setModalNuevoTrabajador(true)}>+ Trabajador</Btn>
          <Btn size="sm" onClick={() => setModalNuevoDoc(true)}>+ Doc adicional</Btn>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Cumplimiento', val:`${pctContrato}%`, color: pctContrato>=90?C.green:pctContrato>=70?C.amber:C.red },
          { label:'Trabajadores', val:trabajadores.length, color:C.blue },
          { label:'Tipos de doc.', val:docTipos.length, color:C.purple },
          { label:'Alertas', val:trabajadoresConStats.reduce((s,t)=>s+t.alertas,0), color:C.red },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', borderRadius:10, padding:14 }}>
            <div style={{ fontSize:20, fontWeight:800, color:k.color }}>{k.val}</div>
            <div style={{ fontSize:12, color:C.textMuted }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Docs adicionales activos */}
      {docTipos.filter(d => d.es_adicional).length > 0 && (
        <div style={{ background:'#eff6ff', borderRadius:10, padding:14, marginBottom:16,
          border:`1px solid #bfdbfe` }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#1d4ed8', marginBottom:6 }}>
            📌 Documentos adicionales asignados a este contrato
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {docTipos.filter(d => d.es_adicional).map(d => (
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

      {/* Filtros */}
      <div style={{ display:'flex', gap:10, marginBottom:14 }}>
        <input value={filtro} onChange={e => setFiltro(e.target.value)}
          placeholder="Buscar trabajador..."
          style={{ flex:1, padding:'8px 12px', border:`1px solid ${C.border}`, borderRadius:8,
            fontSize:14, fontFamily:'inherit', outline:'none' }} />
        <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
          style={{ padding:'8px 12px', border:`1px solid ${C.border}`, borderRadius:8,
            fontSize:14, fontFamily:'inherit', background:'#fff', cursor:'pointer' }}>
          <option value="nombre">Ordenar: Nombre</option>
          <option value="pct">Ordenar: % cumplimiento</option>
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:`1px solid ${C.border}` }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc' }}>
              {['RUT','Nombre','Cargo','Cumplimiento','Alertas',''].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11,
                  fontWeight:700, color:C.textMuted, textTransform:'uppercase',
                  letterSpacing:'0.05em', borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={6} style={{ padding:28, textAlign:'center', color:C.textMuted, fontSize:13 }}>
                Sin trabajadores. Agrega uno con el botón de arriba.
              </td></tr>
            )}
            {filtrados.map(t => (
              <tr key={t.id} onClick={() => onSelectTrabajador(t)}
                style={{ cursor:'pointer', transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <td style={{ padding:'12px 16px', fontSize:13, color:C.textMuted }}>{t.rut}</td>
                <td style={{ padding:'12px 16px', fontSize:13, fontWeight:600, color:C.text }}>
                  {t.nombres} {t.apellidos}
                </td>
                <td style={{ padding:'12px 16px', fontSize:13, color:C.textMuted }}>{t.cargo}</td>
                <td style={{ padding:'12px 16px', minWidth:160 }}>
                  <ProgressBar pct={t.pct} />
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>{t.ok}/{t.total} docs</div>
                </td>
                <td style={{ padding:'12px 16px' }}>
                  {t.alertas > 0
                    ? <span style={{ background:C.redLight, color:'#991b1b', borderRadius:99,
                        padding:'2px 8px', fontSize:12, fontWeight:700 }}>⚠️ {t.alertas}</span>
                    : <span style={{ color:C.green, fontSize:12, fontWeight:600 }}>✓</span>}
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); onSelectTrabajador(t) }}>
                    Ver →
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo doc adicional */}
      {modalNuevoDoc && (
        <Modal title="Agregar documento adicional" onClose={() => setModalNuevoDoc(false)}>
          <p style={{ fontSize:13, color:C.textMuted, marginTop:0 }}>
            Este documento se asignará a <strong>todos los trabajadores</strong> del contrato {contrato.id}.
            El % de cumplimiento se recalculará automáticamente.
          </p>
          <Input label="Nombre del documento" value={nuevoDocNombre}
            onChange={e => setNuevoDocNombre(e.target.value)}
            placeholder="Ej: Curso Manejo Defensivo" />
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.textMuted,
              marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>Tipo</label>
            <select value={nuevoDocTipo} onChange={e => setNuevoDocTipo(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:`1px solid ${C.border}`,
                borderRadius:8, fontSize:14, fontFamily:'inherit', background:'#fff' }}>
              <option value="con_vencimiento">Con vencimiento (tiene fecha de expiración)</option>
              <option value="permanente">Permanente (no vence)</option>
            </select>
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModalNuevoDoc(false)}>Cancelar</Btn>
            <Btn onClick={addDocAdicional}>Agregar a todos</Btn>
          </div>
        </Modal>
      )}

      {/* Modal nuevo trabajador */}
      {modalNuevoTrabajador && (
        <Modal title="Agregar trabajador" onClose={() => setModalNuevoTrabajador(false)}>
          <Input label="RUT" value={nuevoTrab.rut} onChange={e => setNuevoTrab(p=>({...p,rut:e.target.value}))} placeholder="12345678-9" />
          <Input label="Nombres" value={nuevoTrab.nombres} onChange={e => setNuevoTrab(p=>({...p,nombres:e.target.value}))} />
          <Input label="Apellidos" value={nuevoTrab.apellidos} onChange={e => setNuevoTrab(p=>({...p,apellidos:e.target.value}))} />
          <Input label="Cargo" value={nuevoTrab.cargo} onChange={e => setNuevoTrab(p=>({...p,cargo:e.target.value}))} placeholder="Técnico / Supervisor" />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModalNuevoTrabajador(false)}>Cancelar</Btn>
            <Btn onClick={crearTrabajador}>Guardar</Btn>
          </div>
        </Modal>
      )}

      {/* Modal importar CSV */}
      {modalImport && (
        <Modal title="Importar trabajadores desde CSV" onClose={() => setModalImport(false)}>
          <p style={{ fontSize:13, color:C.textMuted, marginTop:0 }}>
            Formato esperado (con encabezado):<br/>
            <code style={{ background:'#f1f5f9', padding:'2px 6px', borderRadius:4, fontSize:12 }}>
              rut,nombres,apellidos,cargo
            </code>
          </p>
          <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
            rows={8} placeholder="rut,nombres,apellidos,cargo&#10;12345678-9,Juan,Pérez,Técnico"
            style={{ width:'100%', padding:'9px 12px', border:`1px solid ${C.border}`,
              borderRadius:8, fontSize:13, fontFamily:'monospace', resize:'vertical',
              boxSizing:'border-box' }} />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
            <Btn variant="ghost" onClick={() => setModalImport(false)}>Cancelar</Btn>
            <Btn onClick={importarCSV}>Importar</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── VISTA TRABAJADOR ─────────────────────────────────────────────────────────
const TrabajadorView = ({ trabajador, contrato, onBack }) => {
  const [docTipos, setDocTipos] = useState([])
  const [docsCargados, setDocsCargados] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalDoc, setModalDoc] = useState(null) // docTipo seleccionado para subir
  const [archivo, setArchivo] = useState(null)
  const [fechaVenc, setFechaVenc] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const cargar = useCallback(async () => {
    const [dt, dc] = await Promise.all([
      getDocTipos(contrato.id),
      getDocsCargados(trabajador.id),
    ])
    setDocTipos(dt)
    setDocsCargados(dc)
    setLoading(false)
  }, [trabajador.id, contrato.id])

  useEffect(() => { cargar() }, [cargar])

  const { pct, ok, total } = calcularCumplimiento(docTipos, docsCargados)

  const subirDoc = async () => {
    if (!archivo || !modalDoc) return
    setSubiendo(true)
    await subirDocumento({
      trabajadorId: trabajador.id,
      contratoId: contrato.id,
      docTipoId: modalDoc.id,
      archivo,
      fechaVenc: fechaVenc || null,
    })
    setModalDoc(null); setArchivo(null); setFechaVenc(''); setSubiendo(false)
    cargar()
  }

  const eliminar = async (docId) => {
    if (!confirm('¿Eliminar este documento?')) return
    await eliminarDocumento(docId)
    cargar()
  }

  if (loading) return <div style={{ padding:40, color:C.textMuted }}>Cargando...</div>

  // Agrupar: permanentes y con vencimiento
  const permanentes = docTipos.filter(d => d.tipo === 'permanente')
  const conVenc = docTipos.filter(d => d.tipo === 'con_vencimiento')

  const renderDocRow = (tipo) => {
    const cargado = docsCargados.find(d => d.docTipoId === tipo.id)
    const status = cargado ? cargado.estado : 'falta'

    return (
      <tr key={tipo.id} style={{ borderBottom:`1px solid ${C.border}` }}>
        <td style={{ padding:'10px 16px', fontSize:13, color:C.text, fontWeight:500 }}>
          {tipo.nombre}
          {tipo.es_adicional && (
            <span style={{ marginLeft:6, background:'#dbeafe', color:'#1d4ed8', fontSize:10,
              padding:'1px 5px', borderRadius:99, fontWeight:700 }}>ADICIONAL</span>
          )}
        </td>
        <td style={{ padding:'10px 16px' }}><Badge status={status} /></td>
        <td style={{ padding:'10px 16px', fontSize:12, color:C.textMuted }}>
          {cargado?.fechaVenc ? new Date(cargado.fechaVenc).toLocaleDateString('es-CL') : '—'}
        </td>
        <td style={{ padding:'10px 16px' }}>
          <div style={{ display:'flex', gap:6 }}>
            {cargado?.url && (
              <a href={cargado.url} target="_blank" rel="noreferrer">
                <Btn size="sm" variant="ghost">👁 Ver</Btn>
              </a>
            )}
            <Btn size="sm" variant="ghost" onClick={() => setModalDoc(tipo)}>
              {cargado ? '🔄 Reemplazar' : '📎 Subir'}
            </Btn>
            {cargado && (
              <Btn size="sm" variant="danger" onClick={() => eliminar(cargado.id)}>🗑</Btn>
            )}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div style={{ padding:28, overflowY:'auto', flex:1 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <Btn variant="ghost" size="sm" onClick={onBack}>← Volver</Btn>
        <div style={{ flex:1 }}>
          <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:C.text }}>
            {trabajador.nombres} {trabajador.apellidos}
          </h2>
          <div style={{ fontSize:13, color:C.textMuted }}>
            {trabajador.cargo} · {trabajador.rut} · {contrato.id}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:28, fontWeight:900,
            color: pct>=90 ? C.green : pct>=70 ? C.amber : C.red }}>{pct}%</div>
          <div style={{ fontSize:12, color:C.textMuted }}>{ok}/{total} documentos</div>
        </div>
      </div>

      <div style={{ marginBottom:20 }}>
        <ProgressBar pct={pct} />
      </div>

      {/* Documentos permanentes */}
      <div style={{ background:'#fff', borderRadius:12, overflow:'hidden',
        border:`1px solid ${C.border}`, marginBottom:16 }}>
        <div style={{ padding:'12px 16px', background:'#f8fafc',
          borderBottom:`1px solid ${C.border}`, fontSize:12, fontWeight:700,
          color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em' }}>
          Documentos permanentes ({permanentes.length})
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc' }}>
              {['Documento','Estado','Vence','Acciones'].map(h => (
                <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11,
                  fontWeight:700, color:C.textMuted, borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{permanentes.map(renderDocRow)}</tbody>
        </table>
      </div>

      {/* Documentos con vencimiento */}
      <div style={{ background:'#fff', borderRadius:12, overflow:'hidden',
        border:`1px solid ${C.border}` }}>
        <div style={{ padding:'12px 16px', background:'#f8fafc',
          borderBottom:`1px solid ${C.border}`, fontSize:12, fontWeight:700,
          color:C.textMuted, textTransform:'uppercase', letterSpacing:'0.05em' }}>
          Documentos con vencimiento ({conVenc.length})
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc' }}>
              {['Documento','Estado','Vence','Acciones'].map(h => (
                <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11,
                  fontWeight:700, color:C.textMuted, borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{conVenc.map(renderDocRow)}</tbody>
        </table>
      </div>

      {/* Modal subir documento */}
      {modalDoc && (
        <Modal title={`Subir: ${modalDoc.nombre}`} onClose={() => { setModalDoc(null); setArchivo(null); setFechaVenc('') }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.textMuted,
              marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>
              Archivo (PDF, JPG, PNG)
            </label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setArchivo(e.target.files[0])}
              style={{ fontSize:13, width:'100%' }} />
          </div>
          {modalDoc.tipo === 'con_vencimiento' && (
            <Input label="Fecha de vencimiento" type="date" value={fechaVenc}
              onChange={e => setFechaVenc(e.target.value)} />
          )}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:8 }}>
            <Btn variant="ghost" onClick={() => { setModalDoc(null); setArchivo(null); setFechaVenc('') }}>
              Cancelar
            </Btn>
            <Btn onClick={subirDoc} disabled={!archivo || subiendo}>
              {subiendo ? 'Subiendo...' : '📤 Subir documento'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── VISTA ALERTAS ────────────────────────────────────────────────────────────
const AlertasView = ({ contratos, statsMap }) => {
  const todas = Object.values(statsMap).flatMap(s => s.alertas || [])
  const vencidos = todas.filter(a => a.tipo === 'vencido')
  const proximos30 = todas.filter(a => a.tipo === 'proximo' && a.diasRestantes !== null && a.diasRestantes <= 30)
  const proximos60 = todas.filter(a => a.tipo === 'proximo' && a.diasRestantes !== null && a.diasRestantes > 30)

  const AlertaRow = ({ a }) => (
    <tr style={{ borderBottom:`1px solid ${C.border}` }}>
      <td style={{ padding:'10px 16px', fontSize:13, fontWeight:600, color:C.text }}>{a.trabajador}</td>
      <td style={{ padding:'10px 16px', fontSize:13, color:C.textMuted }}>{a.doc}</td>
      <td style={{ padding:'10px 16px', fontSize:12 }}>
        <span style={{ background:a.tipo==='vencido'?'#fee2e2':'#fef9c3',
          color:a.tipo==='vencido'?'#991b1b':'#92400e',
          padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>
          {a.tipo === 'vencido' ? 'VENCIDO' : a.diasRestantes !== null ? `${a.diasRestantes}d` : 'PRÓXIMO'}
        </span>
      </td>
      <td style={{ padding:'10px 16px', fontSize:12, color:C.textMuted }}>{a.contrato}</td>
    </tr>
  )

  const Tabla = ({ titulo, items, color }) => (
    <div style={{ background:'#fff', borderRadius:12, overflow:'hidden',
      border:`1px solid ${C.border}`, marginBottom:16 }}>
      <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`,
        background:`${color}15`, fontSize:13, fontWeight:700, color }}>
        {titulo} ({items.length})
      </div>
      {items.length === 0
        ? <p style={{ padding:'16px', color:C.textMuted, fontSize:13 }}>Sin alertas de este tipo</p>
        : <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f8fafc' }}>
              {['Trabajador','Documento','Estado','Contrato'].map(h => (
                <th key={h} style={{ padding:'8px 16px', textAlign:'left', fontSize:11,
                  fontWeight:700, color:C.textMuted, borderBottom:`1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{items.map((a,i) => <AlertaRow key={i} a={a} />)}</tbody>
          </table>
      }
    </div>
  )

  return (
    <div style={{ padding:28, overflowY:'auto', flex:1 }}>
      <h2 style={{ margin:'0 0 20px', fontSize:20, fontWeight:800, color:C.text }}>Centro de alertas</h2>
      <Tabla titulo="🔴 Documentos vencidos"        items={vencidos}   color={C.red}   />
      <Tabla titulo="🟡 Próximos a vencer (≤ 30d)"  items={proximos30} color={C.amber} />
      <Tabla titulo="🟠 Próximos a vencer (31-60d)" items={proximos60} color="#f97316" />
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [contratos, setContratos] = useState([])
  const [statsMap, setStatsMap] = useState({})
  const [view, setView] = useState('dashboard')
  const [contratoActivoId, setContratoActivoId] = useState(null)
  const [trabajadorActivo, setTrabajadorActivo] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u); setAuthLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return
    getContratos().then(data => {
      setContratos(data)
      // Cargar stats de todos los contratos para el dashboard
      cargarStatsGlobales(data)
    })

    // Exponer seed en consola para setup inicial
    window.seed = seedInicial
    window.seedHelp = () => console.log('Escribe seed() para crear los contratos y documentos base en Firestore')
    console.log('💡 Tip: escribe seed() en la consola para hacer el setup inicial de Firestore')
  }, [user])

  const cargarStatsGlobales = async (contratos) => {
    const map = {}
    for (const c of contratos) {
      try {
        const [trabajadores, docTipos, docsCargados] = await Promise.all([
          getTrabajadores(c.id),
          getDocTipos(c.id),
          getDocsCargadosPorContrato(c.id),
        ])

        const trabajadoresConStats = trabajadores.map(t => {
          const docsT = docsCargados.filter(d => d.trabajadorId === t.id)
          const { pct } = calcularCumplimiento(docTipos, docsT)
          return { ...t, pct, contratoId: c.id }
        })

        const pct = trabajadoresConStats.length
          ? Math.round(trabajadoresConStats.reduce((s,t)=>s+t.pct,0) / trabajadoresConStats.length) : 0

        // Construir alertas
        const alertas = []
        for (const dc of docsCargados) {
          if (dc.estado === 'vencido' || dc.estado === 'proximo') {
            const t = trabajadores.find(t => t.id === dc.trabajadorId)
            const dt = docTipos.find(d => d.id === dc.docTipoId)
            if (!t || !dt) continue
            const diasRestantes = dc.fechaVenc
              ? Math.round((new Date(dc.fechaVenc) - new Date()) / 86400000) : null
            alertas.push({
              tipo: dc.estado,
              trabajador: `${t.nombres} ${t.apellidos}`,
              doc: dt.nombre,
              contrato: c.id,
              diasRestantes,
            })
          }
        }

        map[c.id] = {
          pct,
          totalTrabajadores: trabajadores.length,
          alertasCount: alertas.length,
          alertas,
          trabajadores: trabajadoresConStats,
        }
      } catch (e) {
        map[c.id] = { pct: 0, totalTrabajadores: 0, alertasCount: 0, alertas: [], trabajadores: [] }
      }
    }
    setStatsMap(map)
  }

  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh',
      fontSize:14, color:'#64748b' }}>Cargando...</div>
  )

  if (!user) return <LoginView onLogin={() => {}} />

  const contratoActivo = contratos.find(c => c.id === contratoActivoId)

  const handleNav = (v, contratoId) => {
    setView(v)
    setContratoActivoId(contratoId)
    setTrabajadorActivo(null)
  }

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:"'Inter', system-ui, sans-serif",
      background:C.bg, overflow:'hidden' }}>
      <Sidebar
        view={view}
        contratoActivo={contratoActivoId}
        contratos={contratos}
        onNav={handleNav}
        onLogout={() => signOut(auth)}
      />
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {view === 'dashboard' && (
          <DashboardView contratos={contratos} statsMap={statsMap} onNav={handleNav} />
        )}
        {view === 'alertas' && (
          <AlertasView contratos={contratos} statsMap={statsMap} />
        )}
        {view === 'contrato' && contratoActivo && !trabajadorActivo && (
          <ContratoView
            contrato={contratoActivo}
            onSelectTrabajador={(t) => setTrabajadorActivo(t)}
          />
        )}
        {view === 'contrato' && contratoActivo && trabajadorActivo && (
          <TrabajadorView
            trabajador={trabajadorActivo}
            contrato={contratoActivo}
            onBack={() => setTrabajadorActivo(null)}
          />
        )}
      </main>
    </div>
  )
}
