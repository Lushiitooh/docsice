import { useState } from 'react'
import { C, COLORES_CONTRATO, codeOf } from '../constants'
import { Btn, Modal, Input } from '../components/ui'
import {
  addContrato, editarContrato, eliminarContrato,
} from '../firebase/service'

// ─── COLOR PICKER ─────────────────────────────────────────────────────────────
const ColorPicker = ({ value, onChange }) => (
  <div style={{ marginBottom:16 }}>
    <label style={{ display:'block', fontSize:12, fontWeight:600, color:C.textMuted,
      marginBottom:8, textTransform:'uppercase' }}>Color</label>
    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
      {COLORES_CONTRATO.map(col => (
        <div key={col} onClick={() => onChange(col)}
          style={{ width:28, height:28, borderRadius:'50%', background:col, cursor:'pointer',
            border:`3px solid ${value===col?C.text:'transparent'}`,
            boxSizing:'border-box', transition:'border-color 0.15s' }} />
      ))}
    </div>
  </div>
)

// ─── GESTIÓN DE CONTRATOS ─────────────────────────────────────────────────────
export const GestionContratosView = ({ contratos, onContratosChange, isMobile, uid, isAdmin }) => {
  const [modalNuevo, setModalNuevo]             = useState(false)
  const [modalEditar, setModalEditar]           = useState(false)
  const [nuevoContrato, setNuevoContrato]       = useState({ codigoInterno:'', nombre:'', codigo:'', color:'#3b82f6' })
  const [contratoEditar, setContratoEditar]     = useState({ id:'', codigoInterno:'', nombre:'', codigo:'', color:'#3b82f6' })

  const crearContrato = async () => {
    if (!nuevoContrato.nombre.trim() || !nuevoContrato.codigo.trim() || !nuevoContrato.codigoInterno.trim()) return
    await addContrato({
      codigoInterno: nuevoContrato.codigoInterno.trim().toUpperCase(),
      nombre: nuevoContrato.nombre.trim(),
      codigo: nuevoContrato.codigo.trim(),
      color: nuevoContrato.color,
    }, uid)
    setNuevoContrato({ codigoInterno:'', nombre:'', codigo:'', color:'#3b82f6' })
    setModalNuevo(false); onContratosChange()
  }

  const guardarEdicion = async () => {
    if (!contratoEditar.nombre.trim() || !contratoEditar.codigo.trim() || !contratoEditar.codigoInterno.trim()) return
    await editarContrato(contratoEditar.id, {
      codigoInterno: contratoEditar.codigoInterno.trim().toUpperCase(),
      nombre: contratoEditar.nombre.trim(),
      codigo: contratoEditar.codigo.trim(),
      color:  contratoEditar.color,
    })
    setModalEditar(false); onContratosChange()
  }

  const eliminarContratoHandler = async (c) => {
    if (!confirm(`¿Eliminar el contrato "${c.nombre}" (${codeOf(c)})?\n\nNota: Los trabajadores y documentos asociados NO se eliminarán de la base de datos.`)) return
    await eliminarContrato(c.id); onContratosChange()
  }

  const abrirEditar = (c) => {
    setContratoEditar({ id:c.id, codigoInterno:c.codigoInterno||'', nombre:c.nombre, codigo:c.codigo, color:c.color })
    setModalEditar(true)
  }

  return (
    <div style={{ padding:isMobile?12:28, overflowY:'auto', flex:1 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h2 style={{ margin:0, fontSize:isMobile?17:20, fontWeight:800, color:C.text }}>Contratos</h2>
        <Btn size="sm" onClick={() => setModalNuevo(true)}>+ Nuevo contrato</Btn>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {contratos.map(c => (
          <div key={c.id} style={{ background:'#fff', borderRadius:12, padding:16,
            border:`1px solid ${C.border}`, borderLeft:`5px solid ${c.color}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:c.color, marginBottom:2 }}>{codeOf(c)}</div>
                <div style={{ fontSize:15, fontWeight:600, color:C.text }}>{c.nombre}</div>
                <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>Código: {c.codigo}</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <Btn size="sm" variant="ghost" onClick={() => abrirEditar(c)}>✏️ Editar</Btn>
                <Btn size="sm" variant="danger" onClick={() => eliminarContratoHandler(c)}>🗑 Eliminar</Btn>
              </div>
            </div>
          </div>
        ))}
        {contratos.length === 0 && (
          <div style={{ textAlign:'center', color:C.textMuted, padding:40, fontSize:13 }}>
            Sin contratos. Crea uno con el botón de arriba.
          </div>
        )}
      </div>

      {modalNuevo && (
        <Modal title="Nuevo contrato" onClose={() => setModalNuevo(false)}>
          <Input label="ID Interno" value={nuevoContrato.codigoInterno}
            onChange={e=>setNuevoContrato(p=>({...p,codigoInterno:e.target.value}))}
            placeholder="Ej: AL10201" />
          <Input label="Nombre del contrato" value={nuevoContrato.nombre}
            onChange={e=>setNuevoContrato(p=>({...p,nombre:e.target.value}))}
            placeholder="Ej: Mantenimiento sistema de peajes..." />
          <Input label="Código de contrato" value={nuevoContrato.codigo}
            onChange={e=>setNuevoContrato(p=>({...p,codigo:e.target.value}))}
            placeholder="Ej: MN-001-2024-G" />
          <ColorPicker value={nuevoContrato.color}
            onChange={col=>setNuevoContrato(p=>({...p,color:col}))} />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModalNuevo(false)}>Cancelar</Btn>
            <Btn onClick={crearContrato}>Crear</Btn>
          </div>
        </Modal>
      )}

      {modalEditar && (
        <Modal title="Editar contrato" onClose={() => setModalEditar(false)}>
          <Input label="ID Interno" value={contratoEditar.codigoInterno}
            onChange={e=>setContratoEditar(p=>({...p,codigoInterno:e.target.value}))}
            placeholder="Ej: AL10201" />
          <Input label="Nombre del contrato" value={contratoEditar.nombre}
            onChange={e=>setContratoEditar(p=>({...p,nombre:e.target.value}))} />
          <Input label="Código de contrato" value={contratoEditar.codigo}
            onChange={e=>setContratoEditar(p=>({...p,codigo:e.target.value}))} />
          <ColorPicker value={contratoEditar.color}
            onChange={col=>setContratoEditar(p=>({...p,color:col}))} />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModalEditar(false)}>Cancelar</Btn>
            <Btn onClick={guardarEdicion}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
