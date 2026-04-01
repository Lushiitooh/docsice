// ─── PALETA DE COLORES GLOBAL ─────────────────────────────────────────────────
export const C = {
  bg: '#f0f2f5', sidebar: '#0f172a', sideText: '#94a3b8',
  blue: '#3b82f6', blueLight: '#eff6ff',
  red: '#ef4444', redLight: '#fef2f2',
  amber: '#f59e0b', amberLight: '#fffbeb',
  green: '#10b981', greenLight: '#ecfdf5',
  purple: '#8b5cf6',
  text: '#1e293b', textMuted: '#64748b', border: '#e2e8f0',
}

// ─── CONFIGURACIÓN DE ESTADOS DE DOCUMENTOS ───────────────────────────────────
export const STATUS_CONFIG = {
  ok:          { label: 'Vigente',      dot: C.green,  bg: C.greenLight, text: '#065f46' },
  proximo:     { label: 'Próx. vencer', dot: C.amber,  bg: C.amberLight, text: '#92400e' },
  vencido:     { label: 'Vencido',      dot: C.red,    bg: C.redLight,   text: '#991b1b' },
  no_aplica:   { label: 'No aplica',    dot: '#94a3b8', bg: '#f8fafc',   text: '#475569' },
  falta:       { label: 'Sin cargar',   dot: '#d1d5db', bg: '#f9fafb',   text: '#6b7280' },
  restriccion: { label: 'Restricción',  dot: C.purple, bg: '#f5f3ff',    text: '#5b21b6' },
}

// ─── COLORES DISPONIBLES PARA CONTRATOS ───────────────────────────────────────
export const COLORES_CONTRATO = [
  '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981',
  '#ef4444', '#f97316', '#06b6d4', '#ec4899',
]

// ─── DOCUMENTOS RESTRINGIDOS EN VISTA PÚBLICA ─────────────────────────────────
// Estos tipos de documento NUNCA se muestran a visitantes (técnicos, supervisores).
// Solo los prevencionistas autenticados pueden verlos.
export const DOCS_RESTRINGIDOS_PUBLICO = ['Contrato', 'Anexo Contrato']

// ─── CUENTA ADMINISTRADORA ────────────────────────────────────────────────────
// Este email tiene acceso a TODOS los contratos de TODOS los prevencionistas.
// Los demás usuarios solo ven y administran sus propios datos.
export const ADMIN_EMAIL = 'lasepulveda@sice.com'

// ─── CÓDIGO VISIBLE DE UN CONTRATO ───────────────────────────────────────────
// Los contratos nuevos llevan el campo `codigoInterno` (ej: AL10201).
// Los contratos del seed antiguo usaban el ID de Firestore como código.
// Esta función garantiza compatibilidad hacia atrás.
export const codeOf = (c) => c?.codigoInterno || c?.id || ''
