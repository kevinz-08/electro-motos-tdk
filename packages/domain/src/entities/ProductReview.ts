/**
 * Reseña verificada de producto (README §22.6).
 *
 * Solo puede escribirla quien compró el producto: cada reseña está atada a un
 * OrderItem de un pedido DELIVERED (una reseña por ítem). Nace PENDING y el admin
 * la aprueba o rechaza — solo las APPROVED cuentan para el rating público.
 */
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ProductReview {
  id: string
  productId: string
  orderItemId: string
  /** 1 a 5 estrellas. */
  rating: number
  /** "¿Recomendarías este producto?" */
  recommends: boolean
  comment: string | null
  /** Nombre público (ej. "Carlos P."). */
  authorName: string
  status: ReviewStatus
  createdAt: Date
}

export const REVIEW_COMMENT_MAX_LENGTH = 1000
export const REVIEW_AUTHOR_MAX_LENGTH = 60

export interface RatingSummary {
  /** Promedio 1–5 redondeado a 1 decimal. */
  average: number
  /** Cantidad de reseñas consideradas. */
  count: number
  /** Porcentaje entero (0–100) de reseñas con recommends = true. */
  recommendPercent: number
}

/** Resume un conjunto de reseñas aprobadas. null si no hay ninguna. */
export function summarizeReviews(reviews: ReadonlyArray<Pick<ProductReview, 'rating' | 'recommends'>>): RatingSummary | null {
  if (reviews.length === 0) return null
  const total = reviews.reduce((sum, r) => sum + r.rating, 0)
  const recommended = reviews.filter((r) => r.recommends).length
  return {
    average: Math.round((total / reviews.length) * 10) / 10,
    count: reviews.length,
    recommendPercent: Math.round((recommended / reviews.length) * 100),
  }
}

/**
 * Formatea el nombre público: primer nombre + inicial del apellido ("Carlos Pérez" → "Carlos P.").
 * Evita publicar el nombre completo del comprador (Ley 1581 de protección de datos).
 */
export function publicAuthorName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Cliente verificado'
  const first = parts[0]!
  const lastInitial = parts.length > 1 ? ` ${parts[parts.length - 1]!.charAt(0).toUpperCase()}.` : ''
  return `${first.charAt(0).toUpperCase()}${first.slice(1)}${lastInitial}`.slice(0, REVIEW_AUTHOR_MAX_LENGTH)
}
