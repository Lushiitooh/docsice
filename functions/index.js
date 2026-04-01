const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { setGlobalOptions }   = require('firebase-functions/v2')
const { defineSecret }       = require('firebase-functions/params')
const https                  = require('https')
const crypto                 = require('crypto')

// Secretos almacenados en Firebase Secret Manager (nunca en el código)
// Para configurarlos: firebase functions:secrets:set CLOUDINARY_CLOUD_NAME
//                     firebase functions:secrets:set CLOUDINARY_API_KEY
//                     firebase functions:secrets:set CLOUDINARY_API_SECRET
const CLOUD_NAME  = defineSecret('CLOUDINARY_CLOUD_NAME')
const API_KEY     = defineSecret('CLOUDINARY_API_KEY')
const API_SECRET  = defineSecret('CLOUDINARY_API_SECRET')

setGlobalOptions({ region: 'us-central1' })

/**
 * Elimina un archivo físico de Cloudinary dado su publicId.
 * Solo puede ser llamado por usuarios autenticados en Firebase.
 *
 * Uso desde el frontend:
 *   const fn = httpsCallable(functions, 'eliminarDeCloudinary')
 *   await fn({ publicId: 'docsice/AL10109/trabajadorId/nombreArchivo' })
 */
exports.eliminarDeCloudinary = onCall(
  { secrets: [CLOUD_NAME, API_KEY, API_SECRET] },
  async (request) => {
    // 1. Verificar que el usuario está autenticado en Firebase
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes estar autenticado para eliminar archivos.')
    }

    const { publicId } = request.data
    if (!publicId || typeof publicId !== 'string') {
      throw new HttpsError('invalid-argument', 'Se requiere un publicId válido.')
    }

    const cloudName = CLOUD_NAME.value()
    const apiKey    = API_KEY.value()
    const apiSecret = API_SECRET.value()

    // 2. Generar firma para la API de Cloudinary
    const timestamp = Math.round(new Date().getTime() / 1000)
    const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex')

    // 3. Llamar a la Cloudinary Destroy API
    const body = JSON.stringify({
      public_id: publicId,
      timestamp,
      api_key:   apiKey,
      signature,
    })

    await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.cloudinary.com',
          path:     `/v1_1/${cloudName}/image/destroy`,
          method:   'POST',
          headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => { data += chunk })
          res.on('end', () => {
            const json = JSON.parse(data)
            if (json.result === 'ok' || json.result === 'not found') {
              resolve(json)
            } else {
              reject(new Error(`Cloudinary error: ${JSON.stringify(json)}`))
            }
          })
        }
      )
      req.on('error', reject)
      req.write(body)
      req.end()
    })

    return { success: true, publicId }
  }
)
