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
  const base = { cursor:disabled?'not-allowed':'pointer', border:'none', borderRadius:8,
    fontFamily:'inherit', fontWeight:600, opacity:disabled?0.5:1, transition:'opacity 0.15s',
    fontSize:size==='sm'?12:14, padding:size==='sm'?'5px 10px':'9px 18px', ...s }
  const v = { primary:{background:C.blue,color:'#fff'}, danger:{background:C.red,color:'#fff'},
    ghost:{background:'transparent',color:C.textMuted,border:`1px solid ${C.border}`} }
  return <button onClick={disabled?undefined:onClick} style={{...base,...v[variant]}}>{children}</button>
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
export const Modal = ({ title, onClose, children }) => (
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
