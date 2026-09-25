import type { IKitRepository } from '@/domain/repositories/IKitRepository'
import { MAX_KIT_ITEMS, MIN_KIT_ITEMS, validateKitPricing, type Kit } from '@/domain/entities/Kit'
import { Result, ok, err, AppError } from '@/domain/shared/Result'

export interface SetKitItemInput {
  productId: string
  quantity: number
}

export interface SetKitInput {
  /** Presente = editar; ausente = crear. */
  id?: string
  name: string
  slug: string
  description?: string | null
  /** Centavos COP. 0 = sin descuento. */
  discountCents: number
  modelId?: string | null
  isActive: boolean
  items: readonly SetKitItemInput[]
}

/**
 * Use case: crear o actualizar un kit completo (docs/seo/plan-kits.md).
 *
 * Reglas:
 *   1. Nombre y slug no vacíos; slug único (excluyendo el propio kit al editar).
 *   2. Entre MIN_KIT_ITEMS (2) y MAX_KIT_ITEMS (8) ítems.
 *   3. Sin productos repetidos; cantidades enteras >= 1.
 *   4. Todos los productos existen y no están en la papelera.
 *   5. El descuento es válido contra la suma REAL de los productos — calculada
 *      aquí, nunca confiando en un total que mande el cliente.
 *
 * Nunca lanza: devuelve `Result`.
 */
export class SetKit {
  constructor(private readonly repo: IKitRepository) {}

  async execute(input: SetKitInput): Promise<Result<Kit>> {
    const name = input.name.trim()
    const slug = input.slug.trim()
    if (!name) return err(new AppError('VALIDATION_ERROR', 'El nombre del kit es obligatorio'))
    if (!slug) return err(new AppError('VALIDATION_ERROR', 'El slug del kit es obligatorio'))

    if (input.items.length < MIN_KIT_ITEMS || input.items.length > MAX_KIT_ITEMS) {
      return err(new AppError('VALIDATION_ERROR', `Un kit debe tener entre ${MIN_KIT_ITEMS} y ${MAX_KIT_ITEMS} productos`))
    }

    const productIds = input.items.map((i) => i.productId)
    if (new Set(productIds).size !== productIds.length) {
      return err(new AppError('VALIDATION_ERROR', 'No repitas un producto en el kit'))
    }
    if (input.items.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1)) {
      return err(new AppError('VALIDATION_ERROR', 'La cantidad de cada producto debe ser un entero mayor o igual a 1'))
    }

    try {
      if (await this.repo.slugExists(slug, input.id)) {
        return err(new AppError('VALIDATION_ERROR', 'Ya existe un kit con ese slug'))
      }

      const products = await this.repo.findProducts(productIds)
      const priceById = new Map(products.map((p) => [p.id, p.price]))
      const missing = productIds.filter((id) => !priceById.has(id))
      if (missing.length > 0) {
        return err(new AppError('VALIDATION_ERROR', 'Alguno de los productos del kit no existe o está en la papelera'))
      }

      const itemsTotal = input.items.reduce((sum, i) => sum + priceById.get(i.productId)! * i.quantity, 0)
      const pricingError = validateKitPricing(itemsTotal, input.discountCents)
      if (pricingError) return err(new AppError('VALIDATION_ERROR', pricingError))

      const kit = await this.repo.save({
        id: input.id,
        name,
        slug,
        description: input.description?.trim() || null,
        discountCents: input.discountCents,
        modelId: input.modelId ?? null,
        isActive: input.isActive,
        items: input.items.map((i, order) => ({ productId: i.productId, quantity: i.quantity, order })),
      })

      return ok(kit)
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'No se pudo guardar el kit', e))
    }
  }
}
