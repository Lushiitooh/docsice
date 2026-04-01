import { C, codeOf } from '../constants'

// ─── TOPBAR MÓVIL ─────────────────────────────────────────────────────────────
export const TopBar = ({ title, onMenuToggle, onBack, onLogout }) => (
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
export const Sidebar = ({ view, contratoActivo, contratos, onNav, onLogout, isMobile, isOpen, onClose }) => {
  const items = [
    { id:'dashboard', icon:'📊', label:'Dashboard' },
    { id:'alertas',   icon:'🔔', label:'Alertas' },
    { id:'contratos', icon:'📋', label:'Contratos' },
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
        zIndex:999, height: isMobile ? '100dvh' : '100%',
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
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{codeOf(c)}</span>
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
