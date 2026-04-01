import { C, STATUS_CONFIG } from '../../constants'

// ─── BADGE DE ESTADO ──────────────────────────────────────────────────────────
export const Badge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.falta
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 8px',
      borderRadius:99, background:cfg.bg, fontSize:11, fontWeight:600, color:cfg.text, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot, flexShrink:0 }} />
      {cfg.label}
    </span>
  )
}

// ─── BARRA DE PROGRESO ────────────────────────────────────────────────────────
export const ProgressBar = ({ pct }) => {
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

// ─── BOTÓN GENÉRICO ───────────────────────────────────────────────────────────
export const Btn = ({ onClick, children, variant='primary', size='md', disabled=false, style:s={} }) => {
  const base = {
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', borderRadius: 8,
    fontFamily: 'inherit', fontWeight: 600,
    opacity: disabled ? 0.5 : 1,
    transition: 'opacity 0.15s',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    // Tamaños con touch targets adecuados (mínimo 36px alto en sm, 44px en md)
    fontSize:  size === 'sm' ? 13 : 14,
    padding:   size === 'sm' ? '8px 13px' : '11px 18px',
    minHeight: size === 'sm' ? 36 : 44,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    ...s
  }
  const v = {
    primary: { background: C.blue, color: '#fff' },
    danger:  { background: C.red,  color: '#fff' },
    ghost:   { background: 'transparent', color: C.textMuted, border: `1px solid ${C.border}` },
  }
  return <button onClick={disabled ? undefined : onClick} style={{...base,...v[variant]}}>{children}</button>
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
// En pantallas < 540px se comporta como bottom-sheet (sube desde abajo).
export const Modal = ({ title, onClose, children }) => {
  const isSmall = typeof window !== 'undefined' && window.innerWidth < 540
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
      display:'flex', flexDirection:'column',
      alignItems: isSmall ? 'stretch' : 'center',
      justifyContent: isSmall ? 'flex-end' : 'center',
      zIndex:1000, padding: isSmall ? 0 : 16 }}>
      <div style={{ background:'#fff',
        borderRadius: isSmall ? '20px 20px 0 0' : 16,
        padding: isSmall ? '20px 16px 32px' : 24,
        width:'100%', maxWidth: isSmall ? '100%' : 460,
        maxHeight:'90dvh', overflowY:'auto',
        boxShadow:'0 -4px 40px rgba(0,0,0,0.15)' }}>
        {isSmall && (
          <div style={{ width:36, height:4, background:'#d1d5db', borderRadius:99,
            margin:'0 auto 16px', flexShrink:0 }} />
        )}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:C.text }}>{title}</h3>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer',
            fontSize:24, color:C.textMuted, lineHeight:1, padding:'0 4px',
            minHeight:36, minWidth:36, display:'flex', alignItems:'center', justifyContent:'center' }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── INPUT CON LABEL ──────────────────────────────────────────────────────────
export const Input = ({ label, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.textMuted,
      marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</label>}
    <input style={{ width:'100%', padding:'10px 12px', border:`1px solid ${C.border}`,
      borderRadius:8, fontSize:16, fontFamily:'inherit', outline:'none',
      boxSizing:'border-box', color:C.text }} {...props} />
  </div>
)
