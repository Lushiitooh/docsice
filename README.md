# docsice
documentacion personal
# DocSICE — Guía de instalación paso a paso

## ESTRUCTURA DE ARCHIVOS
```
docsice/
├── index.html
├── vite.config.js
├── package.json
├── firestore.rules
├── storage.rules
└── src/
    ├── main.jsx
    ├── App.jsx
    └── firebase/
        ├── config.js     ← TUS CREDENCIALES VAN AQUÍ
        └── service.js
```

---

## PASO 1 — Crear proyecto Firebase

1. Ve a https://console.firebase.google.com
2. Clic en "Crear proyecto"
3. Nombre: `docsice-sice` (o el que quieras)
4. Desactiva Google Analytics (no lo necesitas)
5. Espera que se cree el proyecto

---

## PASO 2 — Activar Authentication

1. En Firebase Console → **Authentication** → "Comenzar"
2. Pestaña "Sign-in method" → habilitar **Email/contraseña**
3. Pestaña "Users" → "Agregar usuario"
   - Email: `admin@sice.cl` (o el tuyo)
   - Contraseña: elige una segura
4. Guarda el UID que aparece (no lo necesitas ahora, pero por si acaso)

---

## PASO 3 — Activar Firestore

1. Firebase Console → **Firestore Database** → "Crear base de datos"
2. Elige modo **producción**
3. Región: `us-central` (o `southamerica-east1` para menos latencia)
4. Luego ve a la pestaña **Reglas** y pega el contenido de `firestore.rules`
5. Clic en "Publicar"

---

## PASO 4 — Activar Storage (ya no corre. se ocupa cloudinary)

1. Firebase Console → **Storage** → "Comenzar"
2. Acepta las reglas por defecto
3. Ve a la pestaña **Reglas** y reemplaza todo con el contenido de `storage.rules`
4. Clic en "Publicar"

---

## PASO 5 — Obtener credenciales y pegarlas en config.js

1. Firebase Console → ⚙️ **Project Settings** (engranaje arriba a la izq.)
2. Sección "Tus apps" → clic en `</>` (Web app)
3. Registra la app con el nombre `docsice`
4. Copia el objeto `firebaseConfig` que aparece
5. Abre `src/firebase/config.js` y reemplaza los valores

---

## PASO 6 — Instalar y correr en local

```bash
# En la carpeta docsice/
npm install
npm run dev
# Abre http://localhost:5173/docsice/
```

---

## PASO 7 — Seed inicial (solo una vez)

Esto crea en Firestore los 4 contratos y los 30 tipos de documentos base.

1. Con la app corriendo, inicia sesión
2. Abre la consola del navegador (F12 → Console)
3. Escribe: `seed()` y presiona Enter
4. Espera el mensaje: ✅ Seed completado
5. Refresca la página — ya aparecerán los 4 contratos en el sidebar

**Solo se hace una vez.**

---

## PASO 8 — Agregar tu primer trabajador

Opción A — Manualmente:
1. Clic en un contrato (ej: AL10109) en el sidebar
2. Clic en "+ Trabajador"
3. Ingresa RUT, nombre, cargo
4. Guarda

Opción B — Importar CSV masivo:
1. Clic en "📥 Importar CSV"
2. Pega o escribe en el formato:
   ```
   rut,nombres,apellidos,cargo
   19499927-5,ALVARO,SUAZO,TECNICO
   17782416-K,ANGELO,DONOSO,TECNICO
   ```
3. Clic en "Importar"

---

## PASO 9 — Subir documentos

1. Entra al contrato → clic en un trabajador
2. Verás todos los tipos de documentos con estado "Sin cargar"
3. Clic en "📎 Subir" en cualquier documento
4. Selecciona el archivo (PDF/JPG/PNG)
5. Si es con vencimiento, ingresa la fecha
6. El % se recalcula automáticamente

---

## PASO 10 — Deploy en GitHub Pages

```bash
# 1. Crea un repositorio en GitHub llamado "docsice"
# 2. Sube el código:
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/docsice.git
git push -u origin main

# 3. Instala gh-pages (ya está en package.json)
npm run deploy

# 4. En GitHub → Settings → Pages → Source: gh-pages branch
# 5. Tu app estará en: https://TU_USUARIO.github.io/docsice/
```

**Importante:** en `vite.config.js` cambia `'/docsice/'` por el nombre exacto de tu repo.

---

## LÓGICA DEL % DE CUMPLIMIENTO

```
% = docs cargados (vigentes o no_aplica) / total tipos activos del contrato
```

- Cuando agregas un doc adicional → el denominador sube para TODOS → el % baja
- Cuando subes un archivo → el numerador sube → el % sube
- El recálculo es automático en cada carga de la vista

---

## COLECCIONES EN FIRESTORE

```
contratos/{id}
  nombre, codigo, color

doc_tipos/{id}
  contratoId, nombre, tipo, es_adicional, activo, orden

trabajadores/{id}
  contratoId, rut, nombres, apellidos, cargo, activo

docs_cargados/{id}
  trabajadorId, contratoId, docTipoId
  url, storagePath, fechaVenc, estado
  (estado: ok | proximo | vencido)
```

---

## PRÓXIMOS PASOS (cuando estés listo)

- [ ] Integrar con tu repo HSE existente como módulo independiente
- [ ] Script Python para importar el Excel AL10109 directamente a Firestore
- [ ] Notificaciones por email (Firebase Functions + SendGrid) para alertas automáticas
- [ ] Exportar resumen en Excel con openpyxl
