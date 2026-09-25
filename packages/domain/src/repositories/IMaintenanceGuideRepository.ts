import type { MaintenanceGuide, MaintenanceItem } from '@/domain/entities/MaintenanceGuide'

export interface SaveMaintenanceGuideInput {
  modelId: string
  source: string
  reviewerId: string
  notes: string | null
  reviewedAt: Date
  items: MaintenanceItem[]
}

/**
 * Contrato de acceso a datos de las guías de mantenimiento (docs/seo/, Fase 5 — H-20).
 * Implementado por PrismaMaintenanceGuideRepository en apps/api.
 */
export interface IMaintenanceGuideRepository {
  findByModelId(modelId: string): Promise<MaintenanceGuide | null>

  /** Crea o reemplaza la guía completa de un modelo (con sus puntos de control), de forma atómica. */
  save(input: SaveMaintenanceGuideInput): Promise<MaintenanceGuide>

  deleteByModelId(modelId: string): Promise<void>

  /** true si existe un MotorcycleModel activo con ese id. */
  modelExists(modelId: string): Promise<boolean>

  /** El revisor con ese id, o null si no existe. Solo lo necesario para validar la firma. */
  findReviewer(reviewerId: string): Promise<{ id: string; isActive: boolean } | null>

  /** De los ids dados, los que son productos existentes y no están en la papelera. */
  findExistingProductIds(ids: readonly string[]): Promise<string[]>
}
