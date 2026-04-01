# DocSICE — Control Documental HSE

Sistema de gestión documental para trabajadores por contrato. Permite subir, visualizar y detectar documentos vencidos de forma centralizada, con acceso diferenciado por rol.

**Stack:** React 18 + Vite · Firebase Auth + Firestore · Cloudinary · GitHub Pages · Firebase Cloud Functions

---

## ARQUITECTURA DE ACCESO (3 niveles)

| Rol | Acceso | Cómo entra |
|-----|--------|------------|
| **Público** (técnico, supervisor, trabajador) | Solo lectura. Ve todos los contratos, trabajadores y documentos vigentes (no restringidos) | Link directo, sin contraseña |
| **Prevencionista** | CRUD completo. Solo ve y administra **sus propios** contratos y trabajadores | Botón "🔐 Iniciar sesión" en el banner |
| **Administrador** (`lasepulveda@sice.com`) | CRUD completo. Ve y administra los contratos de **todos** los prevencionistas | Misma pantalla de login |

### Documentos restringidos en vista pública
Los documentos de tipo `Contrato` y `Anexo Contrato` nunca son visibles para usuarios no autenticados. Se filtran en el cliente (`DOCS_RESTRINGIDOS_PUBLICO` en `constants.js`).

### Aislamiento de datos
Cada documento en Firestore lleva un campo `uid` con el UID del prevencionista que lo creó. Las queries filtran por `uid` para aislar los datos. El admin omite el filtro y ve todo.

> **Datos existentes sin campo `uid`** → Solo el administrador los ve. Para asignarlos a un prevencionista, agrega manualmente el campo `uid` en Firestore Console.

---

## ESTRUCTURA DE ARCHIVOS

```
docsice/
├── index.html
├── vite.config.js
├── package.json
├── firebase.json             ← Firestore rules + Cloud Functions config
├── firestore.rules           ← Reglas de seguridad por uid y rol
├── functions/                ← Cloud Functions (eliminación física en Cloudinary)
│   ├── index.js
│   └── package.json
└── src/
    ├── main.jsx
    ├── App.jsx               ← Orquestador raíz. Decide vista pública vs admin.
    ├── constants.js          ← C (colores), STATUS_CONFIG, COLORES_CONTRATO,
    │                            DOCS_RESTRINGIDOS_PUBLICO, ADMIN_EMAIL
    ├── hooks/
    │   └── useIsMobile.js
    ├── components/
    │   ├── ui/index.jsx      ← Badge, ProgressBar, Btn, Modal, Input
    │   └── Sidebar.jsx       ← Sidebar (desktop) + TopBar (móvil)
    ├── views/
    │   ├── PublicView.jsx    ← Vista pública (página principal). Incluye LoginModal.
    │   ├── LoginView.jsx     ← (Reservado, no se usa en el flujo principal)
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
2. Clic en "Crear proyecto" → Nombre: `docsice-sice`
3. Desactiva Google Analytics (no necesario)

---

## PASO 2 — Activar Authentication

1. Firebase Console → **Authentication** → "Comenzar"
2. Pestaña "Sign-in method" → habilitar **Email/contraseña**
3. Pestaña "Users" → crear cuentas:
   - **Administrador:** `lasepulveda@sice.com` (ve todo)
   - **Prevencionistas:** un usuario por cada prevencionista que usará el sistema

> Cada prevencionista verá únicamente los contratos que él mismo haya creado.

---

## PASO 3 — Activar Firestore

1. Firebase Console → **Firestore Database** → "Crear base de datos"
2. Modo **producción** · Región: `southamerica-east1`
3. Ve a la pestaña **Reglas** → pega el contenido de `firestore.rules`
4. Clic en "Publicar"

Las reglas implementadas permiten:
- Lectura pública en las 5 colecciones principales (para la vista sin login)
- Escritura solo a usuarios autenticados
- Modificación/eliminación solo al dueño del documento (`uid == auth.uid`) o al admin

---

## PASO 4 — Cloudinary (almacenamiento de archivos)

El almacenamiento de archivos usa **Cloudinary** (no Firebase Storage).

1. Crea una cuenta en https://cloudinary.com (gratis)
2. En el Dashboard anota: **Cloud name**, **API Key**, **API Secret**
3. Ve a **Settings → Upload presets** → Crear preset:
   - Signing mode: **Unsigned** (para subir desde el frontend)
   - Anota el nombre del preset

---

## PASO 5 — Obtener credenciales Firebase

1. Firebase Console → ⚙️ **Project Settings** → "Tus apps" → `</>`
2. Registra la app con nombre `docsice`
3. Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_API_KEY=tu_api_key
VITE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_PROJECT_ID=tu_proyecto
VITE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_MESSAGING_SENDER_ID=123456789
VITE_APP_ID=1:123:web:abc
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=tu_preset_unsigned
```

> `.env.local` está en `.gitignore` — nunca se sube al repo.

---

## PASO 6 — Instalar y correr en local

```bash
npm install
npm run dev
# Abre http://localhost:5173/docsice/
```

La página principal es la **vista pública**. Para ingresar como prevencionista o admin, clic en "🔐 Iniciar sesión" en el banner superior.

---

## PASO 7 — Seed inicial (solo una vez, por prevencionista)

Si se requiere crear los contratos base de SICE automáticamente:

1. Inicia sesión con tu cuenta de prevencionista
2. Abre la consola del navegador (F12 → Console)
3. Escribe: `seed()` y presiona Enter
4. Espera: ✅ Seed completado
5. Refresca — aparecerán los 4 contratos en el sidebar

> El seed crea los contratos con el `uid` del usuario que lo ejecutó. Cada prevencionista debe ejecutarlo desde su propia sesión si desea tener esa base de contratos.

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
git init && git add . && git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/docsice.git
git push -u origin main
```

En GitHub → Settings → Pages → Source: rama `gh-pages`.

### Variables de entorno en GitHub Actions

GitHub → Settings → Secrets and variables → Actions:

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

## PASO 11 — Deploy Firebase Cloud Functions

Las Cloud Functions permiten eliminar archivos físicamente de Cloudinary al borrar un documento. El `API_SECRET` de Cloudinary se almacena en Firebase Secret Manager (no en el código).

```bash
npm install -g firebase-tools
firebase login
firebase use tu-proyecto-id

# Configurar secretos (nunca van en el código fuente)
firebase functions:secrets:set CLOUDINARY_CLOUD_NAME
firebase functions:secrets:set CLOUDINARY_API_KEY
firebase functions:secrets:set CLOUDINARY_API_SECRET

cd functions && npm install && cd ..
firebase deploy --only functions

# Publicar reglas de Firestore actualizadas
firebase deploy --only firestore:rules
```

> Si no despliegas las Functions, la app sigue funcionando. Los archivos eliminados quedarán en Cloudinary hasta que los limpies manualmente.

---

## COLECCIONES EN FIRESTORE

Todos los documentos incluyen el campo `uid` del prevencionista propietario.

```
contratos/{id}
  codigoInterno (ej: AL10201), nombre, codigo, color, uid

doc_tipos/{id}
  contratoId, nombre, tipo, es_adicional, activo, orden, uid

doc_tipos_worker/{id}
  contratoId, trabajadorId, nombre, tipo, es_individual, activo, uid

trabajadores/{id}
  contratoId, rut, nombres, apellidos, cargo, activo, desvinculado, uid

docs_cargados/{id}
  trabajadorId, contratoId, docTipoId
  url, publicId, fechaVenc, estado, uid
  (estado: ok | proximo | vencido)
```

---

## LÓGICA DEL % DE CUMPLIMIENTO

```
% = docs cargados (vigentes) / total tipos activos del contrato
```

- Agregar doc adicional → denominador sube → % baja
- Subir archivo → numerador sube → % sube
- El recálculo es automático en cada carga de vista

---

## HISTORIAL DE CAMBIOS RELEVANTES

| Versión | Cambio |
|---------|--------|
| Código interno de contrato | Campo `codigoInterno` (ej: AL10201) separado del ID de Firestore. Se ingresa al crear/editar. `codeOf(c)` lo muestra en toda la UI con fallback al ID para contratos legacy. |
| Multi-tenant | Campo `uid` en todos los documentos. Cada prevencionista ve solo sus datos. Admin (`lasepulveda@sice.com`) ve todos. |
| Vista pública default | La página principal es pública (sin login). Prevencionistas acceden por botón "🔐 Iniciar sesión" en el banner. |
| Cloudinary | Reemplazó Firebase Storage. Subida directa desde el frontend con preset unsigned. Eliminación física vía Cloud Function. |
| Modularización | Refactor de monolito App.jsx → hooks/, components/ui/, views/ separados. |
| Reglas Firestore | Lectura pública en 5 colecciones. Escritura autenticada. Modificación solo al dueño o admin. |

---

## PRÓXIMOS PASOS

- [ ] Script para migrar datos existentes sin `uid` asignándolos a un prevencionista específico
- [ ] Notificaciones por email (Firebase Functions + SendGrid) para alertas automáticas de vencimiento
- [ ] Exportar resumen en Excel
- [ ] Filtro por prevencionista en la vista del admin (para ver solo un usuario a la vez)
