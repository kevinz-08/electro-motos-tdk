/**
 * Utilidades para construcción de URLs de Cloudinary optimizadas.
 *
 * Cloudinary permite inyectar parámetros de transformación en la URL DESPUÉS
 * de que la imagen fue subida. La URL sigue siendo válida y Cloudinary aplica
 * las transformaciones en su CDN (no recalcula en cada request: las cachea).
 *
 * Formato de URL de Cloudinary:
 *   https://res.cloudinary.com/{cloud}/image/upload/{transformaciones}/{public_id}
 *
 * Esta utilidad detecta si una URL es de Cloudinary y le inyecta las
 * transformaciones correctas según el contexto (thumbnail, detail, carousel).
 * Si la URL no es de Cloudinary (imagen de otra fuente) la devuelve sin cambios.
 *
 * Transformaciones aplicadas:
 *   f_auto   → WebP en Chrome/Edge/Firefox, AVIF donde está disponible, JPEG fallback
 *   q_auto   → Cloudinary elige la calidad óptima por imagen (IA)
 *   w_{n}    → Redimensiona al ancho indicado (sin upscale, c_limit)
 *   c_limit  → Solo reduce, nunca amplía
 *
 * Impacto estimado vs JPEG sin optimizar:
 *   WebP   → ~30% menos que JPEG a igual calidad visual
 *   AVIF   → ~50% menos que JPEG
 *   q_auto → otro 20-40% de reducción según la imagen
 */

const CLOUDINARY_RE = /^https?:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\//

type ImageContext = 'thumbnail' | 'card' | 'detail' | 'carousel' | 'admin'

const WIDTH: Record<ImageContext, number> = {
  thumbnail: 200,   // carrito, mini-vistas
  card:      480,   // ProductCard (grid 2-4 col)
  detail:    900,   // página de producto (50vw en desktop ≈ 700px + margen)
  carousel:  480,   // ProductCarousel, CategoryExploreCarousel
  admin:     400,   // tabla de productos del admin
}

/**
 * Construye una URL de Cloudinary optimizada para el contexto dado.
 *
 * @param src       URL original almacenada en la BD (Cloudinary o externa)
 * @param context   Contexto de uso — determina el ancho de entrega
 * @returns         URL con transformaciones f_auto,q_auto,w_N,c_limit inyectadas
 *
 * @example
 * cloudinaryUrl(product.images[0], 'card')
 * // → "https://res.cloudinary.com/mi-cloud/image/upload/f_auto,q_auto,w_480,c_limit/v123/producto.jpg"
 */
export function cloudinaryUrl(src: string | undefined | null, context: ImageContext): string {
  if (!src) return ''

  const match = src.match(CLOUDINARY_RE)
  if (!match) return src   // No es Cloudinary — devolver sin cambios

  const width       = WIDTH[context]
  const transforms  = `f_auto,q_auto,w_${width},c_limit`
  const prefix      = match[0]                     // "https://res.cloudinary.com/{cloud}/image/upload/"

  // Si ya tiene transformaciones inyectadas, las reemplazamos para no duplicar
  const rest = src.slice(prefix.length)
  const cleanRest = rest.replace(/^[^v][^/]*\//, '')   // quitar segmento de transforms previo si existe

  return `${prefix}${transforms}/${cleanRest}`
}
