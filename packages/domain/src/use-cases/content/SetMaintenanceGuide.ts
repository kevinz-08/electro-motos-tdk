import type { IMaintenanceGuideRepository } from '@/domain/repositories/IMaintenanceGuideRepository'
import {
  MAINTENANCE_GUIDE_NOTES_MAX_LENGTH,
  MAINTENANCE_SOURCE_MAX_LENGTH,
  MAX_MAINTENANCE_ITEMS,
  MIN_MAINTENANCE_ITEMS,
  validateMaintenanceItem,
  type MaintenanceGuide,
} from '@/domain/entities/MaintenanceGuide'
import { Result, ok, err, AppError } from '@/domain/shared/Result'

export interface SetMaintenanceGuideItemInput {
  label: string
  intervalKm?: number | null
  intervalMonths?: number | null
  notes?: string | null
  productId?: string | null
}

export interface SetMaintenanceGuideInput {
  modelId: string
  source: string
  reviewerId: string
  notes?: string | null
  /** Por defecto, hoy. */
  reviewedAt?: Date
  /** Lista COMPLETA y ordenada: lo que no venga aquí se elimina. */
  items: readonly SetMaintenanceGuideItemInput[]
}

/**
 * Use case: guardar la guía de mantenimiento de un modelo (H-20 + H-21).
 *
 * Reglas:
 *   1. El modelo existe y está activo.
 *   2. La FUENTE es obligatoria: los intervalos no se inventan (regla del proyecto).
 *   3. El REVISOR es obligatorio, existe y está activo: ninguna guía se publica
 *      sin quien la firme (H-21). Es la forma en que el sistema hace cumplir
 *      "sin revisor técnico no se publica" sin una cola de aprobación aparte.
 *   4. Entre 1 y 12 puntos de control, sin nombres repetidos, cada uno con
 *      intervalo en km, en meses o en ambos.
 *   5. Los repuestos enlazados existen y no están en la papelera.
 *   6. La fecha de revisión no puede ser futura.
 *
 * Nunca lanza: devuelve `Result`.
 */
export class SetMaintenanceGuide {
  constructor(private readonly repo: IMaintenanceGuideRepository) {}

  async execute(input: SetMaintenanceGuideInput): Promise<Result<MaintenanceGuide>> {
    const source = input.source.trim()
    if (!source) {
      return err(new AppError('VALIDATION_ERROR', 'La fuente de los intervalos es obligatoria (manual, taller, etc.)'))
    }
    if (source.length > MAINTENANCE_SOURCE_MAX_LENGTH) {
      return err(new AppError('VALIDATION_ERROR', `La fuente admite máximo ${MAINTENANCE_SOURCE_MAX_LENGTH} caracteres`))
    }
    const notes = input.notes?.trim() || null
    if (notes && notes.length > MAINTENANCE_GUIDE_NOTES_MAX_LENGTH) {
      return err(
        new AppError('VALIDATION_ERROR', `La nota general admite máximo ${MAINTENANCE_GUIDE_NOTES_MAX_LENGTH} caracteres`),
      )
    }

    if (input.items.length < MIN_MAINTENANCE_ITEMS || input.items.length > MAX_MAINTENANCE_ITEMS) {
      return err(
        new AppError('VALIDATION_ERROR', `Una guía debe tener entre ${MIN_MAINTENANCE_ITEMS} y ${MAX_MAINTENANCE_ITEMS} puntos de control`),
      )
    }

    const items = input.items.map((i, order) => ({
      label: i.label.trim(),
      intervalKm: i.intervalKm ?? null,
      intervalMonths: i.intervalMonths ?? null,
      notes: i.notes?.trim() || null,
      productId: i.productId || null,
      order,
    }))

    for (const item of items) {
      const itemError = validateMaintenanceItem(item)
      if (itemError) return err(new AppError('VALIDATION_ERROR', itemError))
    }
    const labels = items.map((i) => i.label.toLowerCase())
    if (new Set(labels).size !== labels.length) {
      return err(new AppError('VALIDATION_ERROR', 'No repitas un punto de control en la misma guía'))
    }

    const reviewedAt = input.reviewedAt ?? new Date()
    if (reviewedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      return err(new AppError('VALIDATION_ERROR', 'La fecha de revisión no puede ser futura'))
    }

    try {
      if (!(await this.repo.modelExists(input.modelId))) {
        return err(new AppError('NOT_FOUND', 'Modelo de moto no encontrado'))
      }

      const reviewer = await this.repo.findReviewer(input.reviewerId)
      if (!reviewer) {
        return err(new AppError('VALIDATION_ERROR', 'Elige el revisor técnico que firma esta guía'))
      }
      if (!reviewer.isActive) {
        return err(new AppError('VALIDATION_ERROR', 'El revisor elegido está desactivado: actívalo o elige otro'))
      }

      const productIds = items.flatMap((i) => (i.productId ? [i.productId] : []))
      if (productIds.length > 0) {
        const existing = new Set(await this.repo.findExistingProductIds(productIds))
        if (productIds.some((id) => !existing.has(id))) {
          return err(new AppError('VALIDATION_ERROR', 'Alguno de los repuestos enlazados no existe o está en la papelera'))
        }
      }

      const guide = await this.repo.save({
        modelId: input.modelId,
        source,
        reviewerId: input.reviewerId,
        notes,
        reviewedAt,
        items,
      })
      return ok(guide)
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'No se pudo guardar la guía de mantenimiento', e))
    }
  }
}
