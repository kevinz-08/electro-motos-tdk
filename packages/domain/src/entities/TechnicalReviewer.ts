/**
 * Revisor técnico (docs/seo/, Fase 5 — tarea H-21).
 *
 * Persona con conocimiento mecánico que revisa y firma las guías de
 * mantenimiento. Es la pieza de E-E-A-T del proyecto: cada guía publicada
 * muestra quién la revisó, con su foto, su trayectoria y una página propia en
 * `/autores/[slug]`.
 *
 * Todo lo que se muestra de esta persona lo escribe el administrador desde
 * `/admin/revisores`; nunca se estima ni se completa con texto genérico.
 */

export const MAX_REVIEWER_CREDENTIALS = 10
export const REVIEWER_CREDENTIAL_MAX_LENGTH = 120
export const REVIEWER_HEADLINE_MAX_LENGTH = 120
export const REVIEWER_BIO_MAX_LENGTH = 2000
export const MAX_REVIEWER_EXPERIENCE_YEARS = 80

export interface TechnicalReviewer {
  id: string
  name: string
  slug: string
  /** Rol o título corto: "Mecánico de motos". Opcional. */
  headline: string | null
  /** Años de experiencia. Null = el administrador no lo declaró. */
  yearsExperience: number | null
  /** Resumen de trayectoria (texto libre). */
  bio: string
  /** Certificaciones o formación, una por elemento. */
  credentials: string[]
  photoUrl: string | null
  /** public_id de Cloudinary, para borrar la foto al reemplazarla o eliminar al revisor. */
  photoPublicId: string | null
  /** Inactivo = su página `/autores/[slug]` responde 404 y sus guías dejan de publicarse. */
  isActive: boolean
  createdAt: Date
}

export interface ReviewerProfileInput {
  name: string
  slug: string
  headline?: string | null
  yearsExperience?: number | null
  bio: string
  credentials?: readonly string[]
}

/** Devuelve el primer error de validación del perfil, o null si es válido. */
export function validateReviewerProfile(input: ReviewerProfileInput): string | null {
  if (!input.name.trim()) return 'El nombre completo es obligatorio'
  if (!input.slug.trim()) return 'El slug es obligatorio'
  if (!input.bio.trim()) return 'El resumen de trayectoria es obligatorio'
  if (input.bio.trim().length > REVIEWER_BIO_MAX_LENGTH) {
    return `El resumen de trayectoria admite máximo ${REVIEWER_BIO_MAX_LENGTH} caracteres`
  }
  if (input.headline && input.headline.trim().length > REVIEWER_HEADLINE_MAX_LENGTH) {
    return `El título o rol admite máximo ${REVIEWER_HEADLINE_MAX_LENGTH} caracteres`
  }

  const years = input.yearsExperience
  if (years !== null && years !== undefined) {
    if (!Number.isInteger(years) || years < 0 || years > MAX_REVIEWER_EXPERIENCE_YEARS) {
      return `Los años de experiencia deben ser un entero entre 0 y ${MAX_REVIEWER_EXPERIENCE_YEARS}`
    }
  }

  const credentials = (input.credentials ?? []).map((c) => c.trim()).filter(Boolean)
  if (credentials.length > MAX_REVIEWER_CREDENTIALS) {
    return `Máximo ${MAX_REVIEWER_CREDENTIALS} certificaciones o formaciones`
  }
  if (credentials.some((c) => c.length > REVIEWER_CREDENTIAL_MAX_LENGTH)) {
    return `Cada certificación admite máximo ${REVIEWER_CREDENTIAL_MAX_LENGTH} caracteres`
  }
  return null
}

/** "12 años de experiencia" / "1 año de experiencia" — null si no se declaró. */
export function formatExperience(years: number | null | undefined): string | null {
  if (years === null || years === undefined) return null
  return `${years} ${years === 1 ? 'año' : 'años'} de experiencia`
}
