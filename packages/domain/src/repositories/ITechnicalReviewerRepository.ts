import type { TechnicalReviewer } from '@/domain/entities/TechnicalReviewer'

export interface SaveTechnicalReviewerRecord {
  id?: string
  name: string
  slug: string
  headline: string | null
  yearsExperience: number | null
  bio: string
  credentials: string[]
  photoUrl: string | null
  photoPublicId: string | null
  isActive: boolean
}

/**
 * Contrato de acceso a datos de los revisores técnicos (docs/seo/, Fase 5 — H-21).
 * Implementado por PrismaTechnicalReviewerRepository en apps/api.
 */
export interface ITechnicalReviewerRepository {
  save(input: SaveTechnicalReviewerRecord): Promise<TechnicalReviewer>
  findById(id: string): Promise<TechnicalReviewer | null>
  /** true si el slug ya lo usa otro revisor (excluye `excludeId` al editar). */
  slugExists(slug: string, excludeId?: string): Promise<boolean>
  /** Cuántas guías de mantenimiento firma este revisor. */
  countGuides(reviewerId: string): Promise<number>
  delete(id: string): Promise<void>
}
