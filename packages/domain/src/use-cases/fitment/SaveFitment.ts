/**
 * Alta o edición de UNA compatibilidad desde el panel (docs/seo/, H-37).
 *
 * Es la versión de formulario del importador de CSV: mismas reglas, una fila.
 * La clave natural es (producto + modelo + posición), así que guardar dos veces
 * la misma combinación actualiza en vez de duplicar.
 *
 * Reglas:
 *   1. La fuente es obligatoria: sin ella no hay forma de verificar el dato.
 *   2. Solo se aceptan modelos que existan y estén activos. El formulario no da
 *      de alta modelos: eso se hace aparte, para no duplicar hubs por erratas.
 *   3. Años opcionales, enteros entre 1950 y 2100 y `desde <= hasta`.
 *   4. Verificar deja constancia de quién y cuándo; desmarcar borra ambos datos
 *      y el fitment deja de publicarse.
 */
import type { IFitmentRepository, IMotorcycleRepository } from '../../repositories/IFitmentRepository'
import type { IProductRepository } from '../../repositories/IProductRepository'
import type { Fitment, FitmentPosition } from '../../entities/Motorcycle'
import { Result, ok, err, AppError } from '../../shared/Result'

export const FITMENT_SOURCE_MAX_LENGTH = 300
export const FITMENT_NOTES_MAX_LENGTH = 300
const YEAR_MIN = 1950
const YEAR_MAX = 2100
const POSITIONS: readonly FitmentPosition[] = ['DELANTERA', 'TRASERA', 'AMBAS']

export interface SaveFitmentInput {
  productId: string
  modelId: string
  position: FitmentPosition
  yearFrom?: number | null
  yearTo?: number | null
  notes?: string | null
  source: string
  verified: boolean
  /** Quién guarda: queda como `verifiedBy` si se marca verificado. */
  savedBy: string
}

/** Devuelve el motivo del rechazo, o `null` si los datos son válidos. */
export function validateFitmentInput(input: Omit<SaveFitmentInput, 'savedBy'>): string | null {
  if (!POSITIONS.includes(input.position)) return 'Posición no válida'

  const source = input.source?.trim() ?? ''
  if (!source) return 'La fuente es obligatoria: indica de dónde sale el dato (manual, catálogo, taller…)'
  if (source.length > FITMENT_SOURCE_MAX_LENGTH) {
    return `La fuente no puede superar ${FITMENT_SOURCE_MAX_LENGTH} caracteres`
  }
  if ((input.notes?.trim().length ?? 0) > FITMENT_NOTES_MAX_LENGTH) {
    return `Las notas no pueden superar ${FITMENT_NOTES_MAX_LENGTH} caracteres`
  }

  for (const year of [input.yearFrom, input.yearTo]) {
    if (year == null) continue
    if (!Number.isInteger(year) || year < YEAR_MIN || year > YEAR_MAX) {
      return `Los años deben ser enteros entre ${YEAR_MIN} y ${YEAR_MAX}`
    }
  }
  if (input.yearFrom != null && input.yearTo != null && input.yearFrom > input.yearTo) {
    return 'El año inicial no puede ser posterior al final'
  }
  return null
}

export class SaveFitment {
  constructor(
    private readonly motorcycleRepo: IMotorcycleRepository,
    private readonly fitmentRepo: IFitmentRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  async execute(input: SaveFitmentInput): Promise<Result<{ fitment: Fitment; created: boolean }>> {
    const invalid = validateFitmentInput(input)
    if (invalid) return err(new AppError('VALIDATION_ERROR', invalid))

    try {
      const product = await this.productRepo.findById(input.productId)
      if (!product) return err(new AppError('NOT_FOUND', 'Producto no encontrado'))

      // El catálogo de modelos es de decenas de filas: no merece un método propio.
      const models = await this.motorcycleRepo.findAllModels()
      if (!models.some((m) => m.id === input.modelId)) {
        return err(new AppError('NOT_FOUND', 'El modelo de moto no existe o está inactivo'))
      }

      const notes = input.notes?.trim() || null
      const result = await this.fitmentRepo.upsert({
        productId: input.productId,
        modelId: input.modelId,
        position: input.position,
        yearFrom: input.yearFrom ?? null,
        yearTo: input.yearTo ?? null,
        notes,
        source: input.source.trim(),
        verified: input.verified,
        verifiedAt: input.verified ? new Date() : null,
        verifiedBy: input.verified ? input.savedBy : null,
      })
      return ok(result)
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'Error al guardar la compatibilidad', e))
    }
  }
}
