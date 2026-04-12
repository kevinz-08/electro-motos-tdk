/**
 * Servicio de gestión de imágenes de productos con Cloudinary.
 *
 * Cloudinary es una plataforma CDN especializada en imágenes. Almacena las imágenes
 * de los productos y las sirve optimizadas y con caché global.
 *
 * Configuración requerida en variables de entorno:
 *   CLOUDINARY_CLOUD_NAME  → Nombre del cloud (ej: "electro-motos-tony")
 *   CLOUDINARY_API_KEY     → Llave pública de la API
 *   CLOUDINARY_API_SECRET  → Llave privada (solo servidor, nunca al cliente)
 *
 * Estructura de carpetas en Cloudinary:
 *   electro-motos-tony/products/{sku}-{timestamp}
 *   Ejemplo: electro-motos-tony/products/FRE-BRE-FZ25-001-1712345678
 *
 * Transformaciones automáticas al subir:
 *   - Redimensionado: máx 800×800 px (sin estirar, mantiene proporción)
 *   - Calidad: auto (Cloudinary optimiza para web automáticamente)
 *
 * Las URLs retornadas son HTTPS (secure: true) y van en el array Product.images[].
 *
 * Nota: La integración con el formulario de subida de imágenes del admin está
 * pendiente de implementar (requiere un endpoint de upload con autenticación).
 */
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
  api_key: process.env['CLOUDINARY_API_KEY'],
  api_secret: process.env['CLOUDINARY_API_SECRET'],
  secure: true, // Siempre usar HTTPS para las URLs de imágenes
})

export interface UploadResult {
  publicId: string
  url: string
  secureUrl: string
  width: number
  height: number
}

/** Servicio de gestión de imágenes con Cloudinary */
export class CloudinaryService {
  /** Sube una imagen de producto. Retorna la URL segura. */
  async uploadProductImage(file: Buffer, productSku: string): Promise<UploadResult> {
    const result = await new Promise<UploadResult>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'electro-motos-tony/products',
            public_id: `${productSku}-${Date.now()}`,
            transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
          },
          (error, result) => {
            if (error || !result) {
              reject(error ?? new Error('Upload failed'))
              return
            }
            resolve({
              publicId: result.public_id,
              url: result.url,
              secureUrl: result.secure_url,
              width: result.width,
              height: result.height,
            })
          },
        )
        .end(file)
    })
    return result
  }

  /** Elimina una imagen de Cloudinary por su public_id */
  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId)
  }
}
