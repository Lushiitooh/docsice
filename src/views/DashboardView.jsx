import { C } from '../constants'
import { ProgressBar } from '../components/ui'

export const DashboardView = ({ contratos, statsMap, onNav, isMobile }) => {
  const all      = Object.values(statsMap).flatMap(s => s.alertas || [])
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
