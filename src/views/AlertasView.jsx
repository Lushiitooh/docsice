import { C } from '../constants'

export const AlertasView = ({ statsMap, isMobile }) => {
  const todas    = Object.values(statsMap).flatMap(s => s.alertas || [])
  const vencidos = todas.filter(a => a.tipo==='vencido')
  const prox30   = todas.filter(a => a.tipo==='proximo' && a.diasRestantes!=null && a.diasRestantes<=30)
  const prox60   = todas.filter(a => a.tipo==='proximo' && a.diasRestantes!=null && a.diasRestantes>30)

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
