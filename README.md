# DocSICE — Control Documental HSE

Sistema de gestión documental para trabajadores por contrato. Permite subir, visualizar y detectar documentos vencidos de forma centralizada.

**Stack:** React 18 + Vite · Firebase Auth + Firestore · Cloudinary (almacenamiento de archivos) · GitHub Pages

---

## ESTRUCTURA DE ARCHIVOS

```
docsice/
├── index.html
├── vite.config.js
├── package.json
├── firebase.json             ← Configuración Firebase (Firestore + Functions)
├── firestore.rules
├── functions/                ← Cloud Functions (eliminación física en Cloudinary)
│   ├── index.js
│   └── package.json
└── src/
    ├── main.jsx
    ├── App.jsx               ← Orquestador raíz (solo imports y routing)
    ├── constants.js          ← Colores, STATUS_CONFIG, COLORES_CONTRATO
    ├── hooks/
    │   └── useIsMobile.js
    ├── components/
    │   ├── ui/index.jsx      ← Badge, ProgressBar, Btn, Modal, Input
    │   └── Sidebar.jsx       ← Sidebar + TopBar móvil
    ├── views/
    │   ├── LoginView.jsx
    │   ├── DashboardView.jsx
    │   ├── AlertasView.jsx
    │   ├── ContratoView.jsx
    │   ├── TrabajadorView.jsx
    │   └── GestionContratosView.jsx
    └── firebase/
        ├── config.js         ← Credenciales vía variables de entorno
        └── service.js        ← Todas las operaciones Firestore + Cloudinary
```

---

## PASO 1 — Crear proyecto Firebase

1. Ve a https://console.firebase.google.com
2. Clic en "Crear proyecto" → Nombre: `docsice-sice` (o el que quieras)
3. Desactiva Google Analytics (no lo necesitas)

---

## PASO 2 — Activar Authentication

1. Firebase Console → **Authentication** → "Comenzar"
2. Pestaña "Sign-in method" → habilitar **Email/contraseña**
3. Pestaña "Users" → "Agregar usuario"
   - Email: `admin@sice.cl` (o el tuyo)
   - Contraseña: elige una segura

---

## PASO 3 — Activar Firestore

1. Firebase Console → **Firestore Database** → "Crear base de datos"
2. Elige modo **producción** · Región: `us-central` o `southamerica-east1`
3. Ve a la pestaña **Reglas** y pega el contenido de `firestore.rules`
4. Clic en "Publicar"

---

## PASO 4 — Cloudinary (almacenamiento de archivos)

El almacenamiento de archivos usa **Cloudinary** (no Firebase Storage).

1. Crea una cuenta en https://cloudinary.com (gratis)
2. En el Dashboard anota: **Cloud name**, **API Key**, **API Secret**
3. Ve a **Settings → Upload presets** → Crear preset:
   - Signing mode: **Unsigned** (para subir desde el frontend)
   - Anota el nombre del preset

---

## PASO 5 — Obtener credenciales Firebase y pegarlas

1. Firebase Console → ⚙️ **Project Settings** → sección "Tus apps" → `</>`
2. Registra la app con nombre `docsice`
3. Copia el objeto `firebaseConfig`

Para desarrollo local, crea un archivo `.env.local`:

```env
VITE_API_KEY=tu_api_key
VITE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_PROJECT_ID=tu_proyecto
VITE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_MESSAGING_SENDER_ID=123456789
VITE_APP_ID=1:123:web:abc
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=tu_preset
```

> `.env.local` está en `.gitignore` — nunca se sube al repo.

---

## PASO 6 — Instalar y correr en local

```bash
npm install
npm run dev
# Abre http://localhost:5173/docsice/
```

---

## PASO 7 — Seed inicial (solo una vez)

1. Con la app corriendo, inicia sesión
2. Abre la consola del navegador (F12 → Console)
3. Escribe: `seed()` y presiona Enter
4. Espera: ✅ Seed completado
5. Refresca — aparecerán los 4 contratos en el sidebar

**Solo se hace una vez.**

---

## PASO 8 — Agregar trabajadores

**Opción A — Manual:**
1. Clic en un contrato en el sidebar
2. Clic en "+ Trabajador" → RUT, nombre, cargo → Guardar

**Opción B — Importar CSV masivo:**
1. Clic en "📥 CSV"
2. Pega en formato:
   ```
   rut,nombres,apellidos,cargo
   19499927-5,ALVARO,SUAZO,TECNICO
   ```

---

## PASO 9 — Subir documentos

1. Contrato → clic en trabajador
2. Verás todos los tipos con estado "Sin cargar"
3. Clic en "📎 Subir" → selecciona PDF/JPG/PNG
4. Si tiene vencimiento, ingresa la fecha
5. El % se recalcula automáticamente

---

## PASO 10 — Deploy en GitHub Pages

```bash
# 1. Crea repositorio en GitHub llamado "docsice"
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/docsice.git
git push -u origin main

# 2. Deploy
npm run deploy

# 3. GitHub → Settings → Pages → Source: gh-pages branch
# App disponible en: https://TU_USUARIO.github.io/docsice/
```

En `vite.config.js` el `base` debe coincidir con el nombre exacto del repo.

### Variables de entorno en GitHub Actions

En GitHub → Settings → Secrets and variables → Actions, agrega:

| Secret | Valor |
|--------|-------|
| `VITE_API_KEY` | Firebase API Key |
| `VITE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_PROJECT_ID` | Firebase Project ID |
| `VITE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `VITE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `VITE_APP_ID` | Firebase App ID |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary Upload Preset (unsigned) |

---

## PASO 11 — Deploy Firebase Cloud Functions (eliminación de archivos)

Las Cloud Functions permiten eliminar archivos físicamente de Cloudinary cuando se borra un documento.

```bash
# 1. Instalar Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Asociar el proyecto
firebase use tu-proyecto-id

# 4. Configurar secretos de Cloudinary (API Secret nunca va en el código)
firebase functions:secrets:set CLOUDINARY_CLOUD_NAME
firebase functions:secrets:set CLOUDINARY_API_KEY
firebase functions:secrets:set CLOUDINARY_API_SECRET

# 5. Instalar dependencias de functions
cd functions && npm install && cd ..

# 6. Desplegar
firebase deploy --only functions
```

> Si no despliegas las functions, la app sigue funcionando igual — solo que los archivos eliminados quedarán en Cloudinary hasta que los limpies manualmente desde su dashboard.

---

## LÓGICA DEL % DE CUMPLIMIENTO

```
% = docs cargados (vigentes o no_aplica) / total tipos activos del contrato
```

- Cuando agregas un doc adicional → el denominador sube → el % baja
- Cuando subes un archivo → el numerador sube → el % sube
- El recálculo es automático en cada carga de la vista

---

## COLECCIONES EN FIRESTORE

```
contratos/{id}
  nombre, codigo, color

doc_tipos/{id}
  contratoId, nombre, tipo, es_adicional, activo, orden

doc_tipos_worker/{id}
  contratoId, trabajadorId, nombre, tipo, es_individual, activo

trabajadores/{id}
  contratoId, rut, nombres, apellidos, cargo, activo, desvinculado

docs_cargados/{id}
  trabajadorId, contratoId, docTipoId
  url, publicId, fechaVenc, estado
  (estado: ok | proximo | vencido)
```

---

## PRÓXIMOS PASOS

- [ ] Script Python para importar el Excel AL10109 directamente a Firestore
- [ ] Notificaciones por email (Firebase Functions + SendGrid) para alertas automáticas de vencimiento
- [ ] Exportar resumen en Excel con openpyxl
- [ ] Integrar con repo HSE existente como módulo independiente
