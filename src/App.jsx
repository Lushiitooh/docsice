import { useState, useEffect, useCallback } from 'react'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'
import {
  getContratos, getDocTipos, getTrabajadores, getDocsCargados,
  getDocsCargadosPorContrato, subirDocumento, eliminarDocumento,
  addDocTipo, toggleDocTipo, addTrabajador, desactivarTrabajador,
  importarTrabajadoresCSV, calcularCumplimiento, seedInicial
} from './firebase/service'

const C = {
  bg: '#f0f2f5', sidebar: '#0f172a', sideText: '#94a3b8',
  blue: '#3b82f6', blueLight: '#eff6ff',
  red: '#ef4444', redLight: '#fef2f2',
  amber: '#f59e0b', amberLight: '#fffbeb',
  green: '#10b981', greenLight: '#ecfdf5',
  purple: '#8b5cf6',
  text: '#1e293b', textMuted: '#64748b', border: '#e2e8f0',
}

const STATUS_CONFIG = {
  ok:          { label: 'Vigente',      dot: C.green,  bg: C.greenLight, text: '#065f46' },
  proximo:     { label: 'Próx. vencer', dot: C.amber,  bg: C.amberLight, text: '#92400e' },
  vencido:     { label: 'Vencido',      dot: C.red,    bg: C.redLight,   text: '#991b1b' },
  no_aplica:   { label: 'No aplica',    dot: '#94a3b8', bg: '#f8fafc',   text: '#475569' },
  falta:       { label: 'Sin cargar',   dot: '#d1d5db', bg: '#f9fafb',   text: '#6b7280' },
  restriccion: { label: 'Restricción',  dot: C.purple, bg: '#f5f3ff',    text: '#5b21b6' },
}

// ─── HOOK RESPONSIVE ─────────────────────────────────────────────────────────
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return isMobile
}

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.falta
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 8px',
      borderRadius:99, background:cfg.bg, fontSize:11, fontWeight:600, color:cfg.text, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot, flexShrink:0 }} />
      {cfg.label}
    </span>
  )
}

const ProgressBar = ({ pct }) => {
  const col = pct >= 90 ? C.green : pct >= 70 ? C.amber : C.red
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, borderRadius:99, background:'#e2e8f0', overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:99, transition:'width 0.4s' }} />
      </div>
      <span style={{ fontSize:12, fontWeight:700, color:col, minWidth:32 }}>{pct}%</span>
    </div>
  )
}

const Btn = ({ onClick, children, variant='primary', size='md', disabled=false, style:s={} }) => {
  const base = { cursor:disabled?'not-allowed':'pointer', border:'none', borderRadius:8,
    fontFamily:'inherit', fontWeight:600, opacity:disabled?0.5:1, transition:'opacity 0.15s',
    fontSize:size==='sm'?12:14, padding:size==='sm'?'5px 10px':'9px 18px', ...s }
  const v = { primary:{background:C.blue,color:'#fff'}, danger:{background:C.red,color:'#fff'},
    ghost:{background:'transparent',color:C.textMuted,border:`1px solid ${C.border}`} }
  return <button onClick={disabled?undefined:onClick} style={{...base,...v[variant]}}>{children}</button>
}

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex',
    alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
    <div style={{ background:'#fff', borderRadius:16, padding:24, width:'100%', maxWidth:460,
      maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:C.text }}>{title}</h3>
        <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer',
          fontSize:22, color:C.textMuted, lineHeight:1 }}>×</button>
      </div>
      {children}
    </div>
  </div>
)

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.textMuted,
      marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>}
    <input style={{ width:'100%', padding:'10px 12px', border:`1px solid ${C.border}`,
      borderRadius:8, fontSize:16, fontFamily:'inherit', outline:'none',
      boxSizing:'border-box', color:C.text }} {...props} />
  </div>
)

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const LoginView = () => {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setErr('')
    try { await signInWithEmailAndPassword(auth, email, pass) }
    catch { setErr('Credenciales incorrectas') }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'linear-gradient(135deg,#0f172a,#1e3a5f)', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:380,
        boxShadow:'0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:C.blue, margin:'0 auto 12px',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>🗂️</div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:C.text }}>DocSICE</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:C.textMuted }}>Control Documental · SICE Agencia Chile</p>
        </div>
        <form onSubmit={handleLogin}>
          <Input label="Correo" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@sice.cl" required />
          <Input label="Contraseña" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" required />
          {err && <p style={{ color:C.red, fontSize:13, marginBottom:10 }}>{err}</p>}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:12, background:C.blue, color:'#fff', border:'none',
              borderRadius:8, fontSize:16, fontWeight:700, fontFamily:'inherit',
              cursor:loading?'not-allowed':'pointer', opacity:loading?0.7:1, marginTop:4 }}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── TOPBAR MÓVIL ─────────────────────────────────────────────────────────────
const TopBar = ({ title, onMenuToggle, onBack, onLogout }) => (
  <div style={{ background:C.sidebar, padding:'12px 16px', display:'flex',
    alignItems:'center', gap:12, flexShrink:0, zIndex:10 }}>
    <button onClick={onBack || onMenuToggle}
      style={{ background:'none', border:'none', color: onBack ? '#94a3b8' : '#fff',
        fontSize:20, cursor:'pointer', padding:'0 4px', lineHeight:1, flexShrink:0 }}>
      {onBack ? '←' : '☰'}
    </button>
    <span style={{ flex:1, fontSize:15, fontWeight:700, color:'#fff',
      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{title}</span>
    <button onClick={onLogout}
      style={{ background:'none', border:'none', color:'#ef4444',
        fontSize:13, cursor:'pointer', fontFamily:'inherit', fontWeight:600, flexShrink:0 }}>
      Salir
    </button>
  </div>
)

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const Sidebar = ({ view, contratoActivo, contratos, onNav, onLogout, isMobile, isOpen, onClose }) => {
  const items = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'alertas',   icon:'🔔', label:'Alertas' },
  ]
  const go = (v, id) => { onNav(v, id); if (isMobile) onClose() }

  if (isMobile && !isOpen) return null

  return (
    <>
      {isMobile && (
        <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:998 }} />
      )}
      <div style={{ position: isMobile ? 'fixed' : 'relative', left:0, top:0, bottom:0,
        width:240, background:C.sidebar, display:'flex', flexDirection:'column',
        zIndex:999, height: isMobile ? '100vh' : '100%',
        boxShadow: isMobile ? '4px 0 20px rgba(0,0,0,0.3)' : 'none' }}>

        <div style={{ padding:'20px 16px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>DocSICE</div>
            <div style={{ fontSize:11, color:C.sideText, marginTop:2 }}>SICE Agencia Chile</div>
          </div>
          {isMobile && (
            <button onClick={onClose} style={{ background:'none', border:'none',
              color:'#94a3b8', fontSize:22, cursor:'pointer', lineHeight:1 }}>×</button>
          )}
        </div>

        <nav style={{ padding:'10px 8px', flex:1, overflowY:'auto' }}>
          {items.map(item => (
            <div key={item.id} onClick={() => go(item.id, null)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'10px',
                borderRadius:8, cursor:'pointer', marginBottom:2, fontSize:14, fontWeight:500,
                background: view===item.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: view===item.id ? '#fff' : C.sideText }}>
              <span>{item.icon}</span>{item.label}
            </div>
          ))}

          <div style={{ fontSize:10, fontWeight:700, color:'#475569', letterSpacing:'0.1em',
            textTransform:'uppercase', padding:'14px 10px 6px' }}>Contratos</div>

          {contratos.map(c => (
            <div key={c.id} onClick={() => go('contrato', c.id)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 10px',
                borderRadius:8, cursor:'pointer', marginBottom:2, fontSize:13,
                background: contratoActivo===c.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: contratoActivo===c.id ? '#fff' : C.sideText }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:c.color, flexShrink:0 }} />
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.id}</span>
            </div>
          ))}
        </nav>

        <div style={{ padding:'10px 8px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <div onClick={onLogout} style={{ display:'flex', alignItems:'center', gap:10,
            padding:'10px', borderRadius:8, cursor:'pointer', color:'#ef4444', fontSize:13 }}>
            🚪 Cerrar sesión
          </div>
        </div>
      </div>
    </>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const DashboardView = ({ contratos, statsMap, onNav, isMobile }) => {
  const all = Object.values(statsMap).flatMap(s => s.alertas || [])
  const vencidos = all.filter(a => a.tipo === 'vencido')
  const proximos = all.filter(a => a.tipo === 'proximo')
  const globalPct = contratos.length
    ? Math.round(contratos.reduce((s,c) => s+(statsMap[c.id]?.pct||0), 0) / contratos.length) : 0
  const ranking = Object.values(statsMap).flatMap(s=>s.trabajadores||[])
    .sort((a,b)=>a.pct-b.pct).slice(0,5)

  return (
    <div style={{ padding:isMobile?12:28, overflowY:'auto', flex:1 }}>
      <h2 style={{ margin:'0 0 14px', fontSize:isMobile?17:20, fontWeight:800, color:C.text }}>Dashboard</h2>

      <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',
        gap:10, marginBottom:14 }}>
        {[
          { label:'Cumplimiento global', val:`${globalPct}%`, icon:'📈', color:C.blue },
          { label:'Vencidos',            val:vencidos.length, icon:'🔴', color:C.red },
          { label:'Próximos 60d',        val:proximos.length, icon:'🟡', color:C.amber },
          { label:'Contratos',           val:contratos.length, icon:'📋', color:C.green },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', borderRadius:12, padding:14,
            borderLeft:`4px solid ${k.color}` }}>
            <div style={{ fontSize:18, marginBottom:4 }}>{k.icon}</div>
            <div style={{ fontSize:isMobile?20:26, fontWeight:800, color:k.color }}>{k.val}</div>
            <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(2,1fr)',
        gap:10, marginBottom:14 }}>
        {contratos.map(c => {
          const s = statsMap[c.id] || {}
          return (
            <div key={c.id} onClick={() => onNav('contrato', c.id)}
              style={{ background:'#fff', borderRadius:12, padding:16, cursor:'pointer',
                borderTop:`4px solid ${c.color}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:c.color }}>{c.id}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text, marginTop:2 }}>{c.nombre}</div>
                </div>
                <div style={{ fontSize:22, fontWeight:800,
                  color:s.pct>=90?C.green:s.pct>=70?C.amber:C.red }}>{s.pct||0}%</div>
              </div>
              <ProgressBar pct={s.pct||0} />
              <div style={{ display:'flex', gap:12, marginTop:10 }}>
                <span style={{ fontSize:12, color:C.textMuted }}>👥 {s.totalTrabajadores||0}</span>
                {(s.alertasCount||0)>0 && (
                  <span style={{ fontSize:12, color:C.red, fontWeight:600 }}>⚠️ {s.alertasCount}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:10 }}>
        <div style={{ background:'#fff', borderRadius:12, padding:16 }}>
          <h3 style={{ margin:'0 0 12px', fontSize:14, fontWeight:700, color:C.text }}>
            🔴 Vencidos ({vencidos.length})
          </h3>
          {vencidos.length===0
            ? <p style={{ color:C.textMuted, fontSize:13, margin:0 }}>Sin vencimientos</p>
            : vencidos.slice(0,5).map((a,i) => (
              <div key={i} style={{ padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{a.trabajador}</div>
                <div style={{ fontSize:12, color:C.textMuted }}>{a.doc} · {a.contrato}</div>
              </div>
            ))
          }
        </div>
        <div style={{ background:'#fff', borderRadius:12, padding:16 }}>
          <h3 style={{ margin:'0 0 12px', fontSize:14, fontWeight:700, color:C.text }}>
            📉 Menor cumplimiento
          </h3>
          {ranking.length===0
            ? <p style={{ color:C.textMuted, fontSize:13, margin:0 }}>Sin datos</p>
            : ranking.map((t,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0',
                borderBottom:`1px solid ${C.border}` }}>
                <span style={{ fontSize:12, fontWeight:800, color:C.textMuted, minWidth:16 }}>{i+1}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.nombre}</div>
                  <div style={{ fontSize:11, color:C.textMuted }}>{t.contratoId}</div>
                </div>
                <span style={{ fontSize:13, fontWeight:800, flexShrink:0,
                  color:t.pct>=90?C.green:t.pct>=70?C.amber:C.red }}>{t.pct}%</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ─── VISTA CONTRATO ───────────────────────────────────────────────────────────
const ContratoView = ({ contrato, onSelectTrabajador, isMobile }) => {
  const [trabajadores, setTrabajadores] = useState([])
  const [docTipos, setDocTipos] = useState([])
  const [docsCargados, setDocsCargados] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalNuevoDoc, setModalNuevoDoc] = useState(false)
  const [modalNuevoTrab, setModalNuevoTrab] = useState(false)
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
      getTrabajadores(contrato.id), getDocTipos(contrato.id), getDocsCargadosPorContrato(contrato.id),
    ])
    setTrabajadores(t); setDocTipos(dt); setDocsCargados(dc); setLoading(false)
  }, [contrato.id])

  useEffect(() => { cargar() }, [cargar])

  const addDocAdicional = async () => {
    if (!nuevoDocNombre.trim()) return
    await addDocTipo(contrato.id, nuevoDocNombre.trim(), nuevoDocTipo)
    setNuevoDocNombre(''); setModalNuevoDoc(false); cargar()
  }

  const crearTrabajador = async () => {
    if (!nuevoTrab.rut || !nuevoTrab.nombres) return
    await addTrabajador({ ...nuevoTrab, contratoId: contrato.id })
    setNuevoTrab({ rut:'', nombres:'', apellidos:'', cargo:'' })
    setModalNuevoTrab(false); cargar()
  }

  const importarCSV = async () => {
    if (!csvText.trim()) return
    const count = await importarTrabajadoresCSV(contrato.id, csvText)
    alert(`✅ ${count} trabajadores importados`)
    setModalImport(false); setCsvText(''); cargar()
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

      {/* Lista: cards en móvil, tabla en desktop */}
      {isMobile ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtrados.length===0 && (
            <div style={{ textAlign:'center', color:C.textMuted, padding:28, fontSize:13 }}>
              Sin trabajadores. Agrega uno arriba.
            </div>
          )}
          {filtrados.map(t => (
            <div key={t.id} onClick={() => onSelectTrabajador(t)}
              style={{ background:'#fff', borderRadius:12, padding:14, cursor:'pointer',
                border:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
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
                      <Btn size="sm" variant="ghost" onClick={e=>{e.stopPropagation();onSelectTrabajador(t)}}>Ver →</Btn>
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
    </div>
  )
}

// ─── VISTA TRABAJADOR ─────────────────────────────────────────────────────────
const TrabajadorView = ({ trabajador, contrato, onBack, isMobile }) => {
  const [docTipos, setDocTipos] = useState([])
  const [docsCargados, setDocsCargados] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalDoc, setModalDoc] = useState(null)
  const [archivo, setArchivo] = useState(null)
  const [fechaVenc, setFechaVenc] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const cargar = useCallback(async () => {
    const [dt, dc] = await Promise.all([getDocTipos(contrato.id), getDocsCargados(trabajador.id)])
    setDocTipos(dt); setDocsCargados(dc); setLoading(false)
  }, [trabajador.id, contrato.id])

  useEffect(() => { cargar() }, [cargar])

  const { pct, ok, total } = calcularCumplimiento(docTipos, docsCargados)

  const subirDoc = async () => {
    if (!archivo || !modalDoc) return
    setSubiendo(true)
    await subirDocumento({ trabajadorId:trabajador.id, contratoId:contrato.id,
      docTipoId:modalDoc.id, archivo, fechaVenc:fechaVenc||null })
    setModalDoc(null); setArchivo(null); setFechaVenc(''); setSubiendo(false); cargar()
  }

  const eliminar = async (docId) => {
    if (!confirm('¿Eliminar este documento?')) return
    await eliminarDocumento(docId); cargar()
  }

  if (loading) return <div style={{ padding:40, color:C.textMuted, textAlign:'center' }}>Cargando...</div>

  const permanentes = docTipos.filter(d => d.tipo==='permanente')
  const conVenc = docTipos.filter(d => d.tipo==='con_vencimiento')

  const DocCard = ({ tipo }) => {
    const cargado = docsCargados.find(d => d.docTipoId===tipo.id)
    const status = cargado ? cargado.estado : 'falta'
    return (
      <div style={{ background:'#fff', borderRadius:10, padding:12, border:`1px solid ${C.border}`, marginBottom:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
          <div style={{ flex:1, marginRight:8 }}>
            <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{tipo.nombre}</div>
            {tipo.es_adicional && (
              <span style={{ background:'#dbeafe', color:'#1d4ed8', fontSize:10,
                padding:'1px 5px', borderRadius:99, fontWeight:700 }}>ADICIONAL</span>
            )}
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
          {cargado && <Btn size="sm" variant="danger" onClick={() => eliminar(cargado.id)}>🗑</Btn>}
        </div>
      </div>
    )
  }

  const DocRow = ({ tipo }) => {
    const cargado = docsCargados.find(d => d.docTipoId===tipo.id)
    const status = cargado ? cargado.estado : 'falta'
    return (
      <tr style={{ borderBottom:`1px solid ${C.border}` }}>
        <td style={{ padding:'10px 14px', fontSize:13, color:C.text, fontWeight:500 }}>
          {tipo.nombre}
          {tipo.es_adicional && <span style={{ marginLeft:6, background:'#dbeafe', color:'#1d4ed8',
            fontSize:10, padding:'1px 5px', borderRadius:99, fontWeight:700 }}>ADICIONAL</span>}
        </td>
        <td style={{ padding:'10px 14px' }}><Badge status={status} /></td>
        <td style={{ padding:'10px 14px', fontSize:12, color:C.textMuted, whiteSpace:'nowrap' }}>
          {cargado?.fechaVenc ? new Date(cargado.fechaVenc).toLocaleDateString('es-CL') : '—'}
        </td>
        <td style={{ padding:'10px 14px' }}>
          <div style={{ display:'flex', gap:5 }}>
            {cargado?.url && <a href={cargado.url} target="_blank" rel="noreferrer"><Btn size="sm" variant="ghost">👁</Btn></a>}
            <Btn size="sm" variant="ghost" onClick={() => setModalDoc(tipo)}>{cargado?'🔄':'📎'}</Btn>
            {cargado && <Btn size="sm" variant="danger" onClick={() => eliminar(cargado.id)}>🗑</Btn>}
          </div>
        </td>
      </tr>
    )
  }

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
      {/* Header desktop */}
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

      {/* Resumen móvil */}
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
    </div>
  )
}

// ─── VISTA ALERTAS ────────────────────────────────────────────────────────────
const AlertasView = ({ statsMap, isMobile }) => {
  const todas = Object.values(statsMap).flatMap(s => s.alertas || [])
  const vencidos  = todas.filter(a => a.tipo==='vencido')
  const prox30    = todas.filter(a => a.tipo==='proximo' && a.diasRestantes!=null && a.diasRestantes<=30)
  const prox60    = todas.filter(a => a.tipo==='proximo' && a.diasRestantes!=null && a.diasRestantes>30)

  const Tabla = ({ titulo, items, color }) => (
    <div style={{ background:'#fff', borderRadius:12, overflow:'hidden', border:`1px solid ${C.border}`, marginBottom:12 }}>
      <div style={{ padding:'12px 14px', borderBottom:`1px solid ${C.border}`,
        background:`${color}15`, fontSize:13, fontWeight:700, color }}>{titulo} ({items.length})</div>
      {items.length===0
        ? <p style={{ padding:14, color:C.textMuted, fontSize:13, margin:0 }}>Sin alertas</p>
        : isMobile
          ? items.map((a,i) => (
              <div key={i} style={{ padding:'10px 14px', borderBottom:`1px solid ${C.border}` }}>
                <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{a.trabajador}</div>
                <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{a.doc}</div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                  <span style={{ background:a.tipo==='vencido'?'#fee2e2':'#fef9c3',
                    color:a.tipo==='vencido'?'#991b1b':'#92400e',
                    padding:'1px 7px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                    {a.tipo==='vencido'?'VENCIDO':a.diasRestantes!=null?`${a.diasRestantes}d`:'PRÓXIMO'}
                  </span>
                  <span style={{ fontSize:11, color:C.textMuted }}>{a.contrato}</span>
                </div>
              </div>
            ))
          : <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#f8fafc' }}>
                  {['Trabajador','Documento','Estado','Contrato'].map(h => (
                    <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:11,
                      fontWeight:700, color:C.textMuted, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{items.map((a,i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:'10px 14px', fontSize:13, fontWeight:600 }}>{a.trabajador}</td>
                    <td style={{ padding:'10px 14px', fontSize:13, color:C.textMuted }}>{a.doc}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ background:a.tipo==='vencido'?'#fee2e2':'#fef9c3',
                        color:a.tipo==='vencido'?'#991b1b':'#92400e',
                        padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                        {a.tipo==='vencido'?'VENCIDO':`${a.diasRestantes??'?'}d`}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:C.textMuted }}>{a.contrato}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
      }
    </div>
  )

  return (
    <div style={{ padding:isMobile?12:28, overflowY:'auto', flex:1 }}>
      <h2 style={{ margin:'0 0 14px', fontSize:isMobile?17:20, fontWeight:800, color:C.text }}>Alertas</h2>
      <Tabla titulo="🔴 Documentos vencidos"        items={vencidos} color={C.red}   />
      <Tabla titulo="🟡 Próximos a vencer (≤ 30d)"  items={prox30}   color={C.amber} />
      <Tabla titulo="🟠 Próximos a vencer (31-60d)" items={prox60}   color="#f97316" />
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false) })
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return
    getContratos().then(data => { setContratos(data); cargarStats(data) })
    window.seed = seedInicial
    console.log('💡 Tip: escribe seed() en la consola para hacer el setup inicial de Firestore')
  }, [user])

  const cargarStats = async (contratos) => {
    const map = {}
    for (const c of contratos) {
      try {
        const [trabajadores, docTipos, docsCargados] = await Promise.all([
          getTrabajadores(c.id), getDocTipos(c.id), getDocsCargadosPorContrato(c.id),
        ])
        const tw = trabajadores.map(t => {
          const dc = docsCargados.filter(d => d.trabajadorId===t.id)
          const { pct } = calcularCumplimiento(docTipos, dc)
          return { ...t, pct, contratoId:c.id }
        })
        const pct = tw.length ? Math.round(tw.reduce((s,t)=>s+t.pct,0)/tw.length) : 0
        const alertas = []
        for (const dc of docsCargados) {
          if (dc.estado==='vencido'||dc.estado==='proximo') {
            const t = trabajadores.find(t=>t.id===dc.trabajadorId)
            const dt = docTipos.find(d=>d.id===dc.docTipoId)
            if (!t||!dt) continue
            const dias = dc.fechaVenc ? Math.round((new Date(dc.fechaVenc)-new Date())/86400000) : null
            alertas.push({ tipo:dc.estado, trabajador:`${t.nombres} ${t.apellidos}`,
              doc:dt.nombre, contrato:c.id, diasRestantes:dias })
          }
        }
        map[c.id] = { pct, totalTrabajadores:trabajadores.length,
          alertasCount:alertas.length, alertas, trabajadores:tw }
      } catch {
        map[c.id] = { pct:0, totalTrabajadores:0, alertasCount:0, alertas:[], trabajadores:[] }
      }
    }
    setStatsMap(map)
  }

  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', fontSize:14, color:'#64748b' }}>Cargando...</div>
  )
  if (!user) return <LoginView />

  const contratoActivo = contratos.find(c => c.id===contratoActivoId)

  const handleNav = (v, id) => {
    setView(v); setContratoActivoId(id); setTrabajadorActivo(null)
  }

  const getTitle = () => {
    if (trabajadorActivo) return `${trabajadorActivo.nombres} ${trabajadorActivo.apellidos}`
    if (view==='contrato' && contratoActivo) return contratoActivo.id
    if (view==='alertas') return 'Alertas'
    return 'Dashboard'
  }

  return (
    <div style={{ display:'flex', flexDirection:isMobile?'column':'row',
      height:'100vh', fontFamily:"'Inter',system-ui,sans-serif",
      background:C.bg, overflow:'hidden' }}>

      {isMobile && (
        <TopBar
          title={getTitle()}
          onMenuToggle={() => setSidebarOpen(true)}
          onBack={trabajadorActivo ? () => setTrabajadorActivo(null) : null}
          onLogout={() => signOut(auth)}
        />
      )}

      <Sidebar
        view={view} contratoActivo={contratoActivoId} contratos={contratos}
        onNav={handleNav} onLogout={() => signOut(auth)}
        isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
      />

      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
        {view==='dashboard' && <DashboardView contratos={contratos} statsMap={statsMap} onNav={handleNav} isMobile={isMobile} />}
        {view==='alertas'   && <AlertasView statsMap={statsMap} isMobile={isMobile} />}
        {view==='contrato' && contratoActivo && !trabajadorActivo && (
          <ContratoView contrato={contratoActivo} onSelectTrabajador={t=>setTrabajadorActivo(t)} isMobile={isMobile} />
        )}
        {view==='contrato' && contratoActivo && trabajadorActivo && (
          <TrabajadorView trabajador={trabajadorActivo} contrato={contratoActivo}
            onBack={() => setTrabajadorActivo(null)} isMobile={isMobile} />
        )}
      </main>
    </div>
  )
}
