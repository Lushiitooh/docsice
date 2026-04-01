import { useState, useEffect } from 'react'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase/config'
import { getContratos, getTrabajadores, getDocTipos, getDocsCargadosPorContrato, calcularCumplimiento, seedInicial } from './firebase/service'
import { useIsMobile } from './hooks/useIsMobile'
import { Sidebar, TopBar } from './components/Sidebar'
import { LoginView }            from './views/LoginView'
import { DashboardView }        from './views/DashboardView'
import { AlertasView }          from './views/AlertasView'
import { ContratoView }         from './views/ContratoView'
import { TrabajadorView }       from './views/TrabajadorView'
import { GestionContratosView } from './views/GestionContratosView'
import { PublicView }           from './views/PublicView'

// Detectar si la URL tiene ?vista=publica
const esModoPublico = new URLSearchParams(window.location.search).get('vista') === 'publica'

export default function App() {
  const isMobile = useIsMobile()

  // Si el link tiene ?vista=publica, mostrar directamente la vista pública
  // sin requerir autenticación Firebase
  if (esModoPublico) return <PublicView isMobile={isMobile} />

  const [user, setUser]                       = useState(null)
  const [authLoading, setAuthLoading]         = useState(true)
  const [contratos, setContratos]             = useState([])
  const [statsMap, setStatsMap]               = useState({})
  const [view, setView]                       = useState('dashboard')
  const [contratoActivoId, setContratoActivoId] = useState(null)
  const [trabajadorActivo, setTrabajadorActivo] = useState(null)
  const [sidebarOpen, setSidebarOpen]         = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false) })
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return
    recargarContratos()
    window.seed = seedInicial
    console.log('💡 Tip: escribe seed() en la consola para hacer el setup inicial de Firestore')
  }, [user])

  const recargarContratos = () => {
    getContratos().then(data => { setContratos(data); cargarStats(data) })
  }

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
            const t  = trabajadores.find(t=>t.id===dc.trabajadorId)
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
      background:'#f0f2f5', overflow:'hidden' }}>

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
        {view==='dashboard' && (
          <DashboardView contratos={contratos} statsMap={statsMap} onNav={handleNav} isMobile={isMobile} />
        )}
        {view==='alertas' && (
          <AlertasView statsMap={statsMap} isMobile={isMobile} />
        )}
        {view==='contratos' && (
          <GestionContratosView contratos={contratos} onContratosChange={recargarContratos} isMobile={isMobile} />
        )}
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
