import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, writeBatch
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from './config'
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from './config'

// ─── CONTRATOS ───────────────────────────────────────────────────────────────
export const getContratos = async () => {
  const snap = await getDocs(collection(db, 'contratos'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── TIPOS DE DOCUMENTOS POR CONTRATO ────────────────────────────────────────
export const getDocTipos = async (contratoId) => {
  const q = query(
    collection(db, 'doc_tipos'),
    where('contratoId', '==', contratoId),
    where('activo', '==', true),
    orderBy('orden')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const addDocTipo = async (contratoId, nombre, tipo) => {
  // Obtener el orden máximo actual
  const existentes = await getDocTipos(contratoId)
  const maxOrden = existentes.reduce((m, d) => Math.max(m, d.orden || 0), 0)

  return addDoc(collection(db, 'doc_tipos'), {
    contratoId,
    nombre,
    tipo,           // 'permanente' | 'con_vencimiento'
    es_adicional: true,
    activo: true,
    orden: maxOrden + 1,
    creadoEn: serverTimestamp(),
  })
}

export const toggleDocTipo = async (docTipoId, activo) => {
  await updateDoc(doc(db, 'doc_tipos', docTipoId), { activo })
}

// ─── TRABAJADORES POR CONTRATO ────────────────────────────────────────────────
export const getTrabajadores = async (contratoId) => {
  const q = query(
    collection(db, 'trabajadores'),
    where('contratoId', '==', contratoId),
    where('activo', '==', true)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const addTrabajador = async (data) => {
  return addDoc(collection(db, 'trabajadores'), {
    ...data,
    activo: true,
    creadoEn: serverTimestamp(),
  })
}

export const desactivarTrabajador = async (trabajadorId) => {
  await updateDoc(doc(db, 'trabajadores', trabajadorId), { activo: false })
}

// ─── DOCUMENTOS CARGADOS ──────────────────────────────────────────────────────
export const getDocsCargados = async (trabajadorId) => {
  const q = query(
    collection(db, 'docs_cargados'),
    where('trabajadorId', '==', trabajadorId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const getDocsCargadosPorContrato = async (contratoId) => {
  const q = query(
    collection(db, 'docs_cargados'),
    where('contratoId', '==', contratoId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const subirDocumento = async ({ trabajadorId, contratoId, docTipoId, archivo, fechaVenc }) => {

  // 1. Subir a Cloudinary
  const formData = new FormData()
  formData.append('file', archivo)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', `docsice/${contratoId}/${trabajadorId}`)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    { method: 'POST', body: formData }
  )
  const data = await res.json()
  const url = data.secure_url
  const publicId = data.public_id   // para poder eliminar después

  // 2. Calcular estado
  const estado = calcularEstado(fechaVenc)

  // 3. Verificar si ya existe un doc de este tipo para este trabajador
  const q = query(
    collection(db, 'docs_cargados'),
    where('trabajadorId', '==', trabajadorId),
    where('docTipoId',    '==', docTipoId)
  )
  const snap = await getDocs(q)

  if (!snap.empty) {
    // Actualizar existente (el archivo viejo queda en Cloudinary, no se borra automático)
    await updateDoc(snap.docs[0].ref, {
      url,
      publicId,
      fechaVenc:     fechaVenc || null,
      estado,
      actualizadoEn: serverTimestamp(),
    })
    return snap.docs[0].id
  } else {
    // Crear nuevo
    const docRef = await addDoc(collection(db, 'docs_cargados'), {
      trabajadorId,
      contratoId,
      docTipoId,
      url,
      publicId,
      fechaVenc:  fechaVenc || null,
      estado,
      creadoEn:   serverTimestamp(),
    })
    return docRef.id
  }
}

//─── ELIMINAR DOCUMENTO ───────────────────────────────────────────────────────
// Nota: Cloudinary no permite eliminar desde el frontend con preset unsigned.
// El archivo queda en Cloudinary pero se borra el registro de Firestore.
// Si necesitas borrar el archivo físico, se hace desde el dashboard de Cloudinary.
export const eliminarDocumento = async (docCargadoId) => {
  await deleteDoc(doc(db, 'docs_cargados', docCargadoId))
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export const calcularEstado = (fechaVenc) => {
  if (!fechaVenc) return 'ok' // permanente sin fecha
  const hoy = new Date()
  const venc = new Date(fechaVenc)
  const diff = (venc - hoy) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'vencido'
  if (diff <= 60) return 'proximo'
  return 'ok'
}

export const calcularCumplimiento = (docTipos, docsCargados) => {
  const tiposActivos = docTipos.filter(t => t.activo)
  const total = tiposActivos.length
  if (total === 0) return { pct: 0, ok: 0, total: 0 }

  const ok = tiposActivos.filter(tipo => {
    const cargado = docsCargados.find(d => d.docTipoId === tipo.id)
    if (!cargado) return false
    return cargado.estado !== 'vencido'
  }).length

  return { pct: Math.round((ok / total) * 100), ok, total }
}

// ─── IMPORTAR TRABAJADORES DESDE CSV ─────────────────────────────────────────
// CSV esperado: rut,nombres,apellidos,cargo
export const importarTrabajadoresCSV = async (contratoId, csvText) => {
  const lines = csvText.trim().split('\n').slice(1) // skip header
  const batch = writeBatch(db)
  let count = 0

  for (const line of lines) {
    const [rut, nombres, apellidos, cargo] = line.split(',').map(s => s.trim())
    if (!rut || !nombres) continue
    const ref = doc(collection(db, 'trabajadores'))
    batch.set(ref, {
      contratoId,
      rut,
      nombres,
      apellidos: apellidos || '',
      cargo: cargo || '',
      activo: true,
      creadoEn: serverTimestamp(),
    })
    count++
  }

  await batch.commit()
  return count
}

// ─── SEED INICIAL (ejecutar 1 sola vez desde consola del navegador) ───────────
// window.seed() → crea los 4 contratos y los doc_tipos base en Firestore
export const seedInicial = async () => {
  const contratos = [
    { id: 'AL10109', codigo: 'MN-179-2015-G', nombre: 'Mantenimiento Sistema de Peajes y Máquinas L63', color: '#3b82f6' },
    { id: 'AL10187', codigo: 'NE-13-2023-G',  nombre: 'Mantenimiento Red de Carga y Uso Zona 2',        color: '#8b5cf6' },
    { id: 'AL10177', codigo: 'EQ35-5C2',       nombre: 'Mantenimiento Sistema PBC-PMR L1/L2/L4/L4A/L5', color: '#f59e0b' },
    { id: 'AL10195', codigo: 'ER2-9C1',        nombre: 'Suministro Puertas Bidireccionales 7 Estaciones',color: '#10b981' },
  ]

  const docTiposBase = [
    { nombre: 'Contrato',                       tipo: 'permanente',       orden: 1  },
    { nombre: 'Anexo Contrato',                 tipo: 'permanente',       orden: 2  },
    { nombre: 'RIOHS',                           tipo: 'permanente',       orden: 3  },
    { nombre: 'REEC',                            tipo: 'permanente',       orden: 4  },
    { nombre: 'Entrega EPP',                     tipo: 'permanente',       orden: 5  },
    { nombre: 'Declaración Salud',              tipo: 'permanente',       orden: 6  },
    { nombre: 'IRL',                             tipo: 'permanente',       orden: 7  },
    { nombre: 'Política Metro',                 tipo: 'permanente',       orden: 8  },
    { nombre: 'Política SICE',                  tipo: 'permanente',       orden: 9  },
    { nombre: 'IRL Cargo',                       tipo: 'permanente',       orden: 10 },
    { nombre: 'DIF MIPER',                       tipo: 'permanente',       orden: 11 },
    { nombre: 'DIF Mapa Riesgo',                tipo: 'permanente',       orden: 12 },
    { nombre: 'DIF Uso EPP',                    tipo: 'permanente',       orden: 13 },
    { nombre: 'DIF REEC',                        tipo: 'permanente',       orden: 14 },
    { nombre: 'DIF Emergencia',                 tipo: 'permanente',       orden: 15 },
    { nombre: 'DIF Sílice',                     tipo: 'permanente',       orden: 16 },
    { nombre: 'DIF PREXOR',                      tipo: 'permanente',       orden: 17 },
    { nombre: 'Guía Técnica',                   tipo: 'permanente',       orden: 18 },
    { nombre: 'DIF TMERT',                       tipo: 'permanente',       orden: 19 },
    { nombre: 'DIF MMC',                         tipo: 'permanente',       orden: 20 },
    { nombre: 'DIF Rad. UV',                    tipo: 'permanente',       orden: 21 },
    { nombre: 'Cap. Trabajo Seguro',            tipo: 'permanente',       orden: 22 },
    { nombre: 'Examen ACHS',                     tipo: 'con_vencimiento',  orden: 23 },
    { nombre: 'Inducción SST Metro',            tipo: 'con_vencimiento',  orden: 24 },
    { nombre: 'OPR DS44',                        tipo: 'con_vencimiento',  orden: 25 },
    { nombre: 'Primera Respuesta Emergencia',   tipo: 'con_vencimiento',  orden: 26 },
    { nombre: 'Responsabilidad Civil',           tipo: 'con_vencimiento',  orden: 27 },
    { nombre: 'Uso de Extintores',              tipo: 'con_vencimiento',  orden: 28 },
    { nombre: 'Alcohol y Drogas',               tipo: 'con_vencimiento',  orden: 29 },
    { nombre: 'Formación Personas Trabajadoras',tipo: 'con_vencimiento',  orden: 30 },
  ]

  // Crear contratos con ID fijo
  for (const c of contratos) {
    const { id, ...data } = c
    await updateDoc(doc(db, 'contratos', id), data).catch(async () => {
      const { setDoc } = await import('firebase/firestore')
      await setDoc(doc(db, 'contratos', id), data)
    })
  }

  // Crear doc_tipos base para cada contrato
  for (const contrato of contratos) {
    for (const tipo of docTiposBase) {
      await addDoc(collection(db, 'doc_tipos'), {
        ...tipo,
        contratoId: contrato.id,
        es_adicional: false,
        activo: true,
        creadoEn: serverTimestamp(),
      })
    }
  }

  console.log('✅ Seed completado: 4 contratos + 30 doc_tipos × 4 = 120 registros')
}
