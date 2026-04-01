import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import { C } from '../constants'
import { Input } from '../components/ui'

export const LoginView = () => {
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [err, setErr]         = useState('')
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
