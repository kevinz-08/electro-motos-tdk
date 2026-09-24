import type { ICrossSellRepository } from '@/domain/repositories/ICrossSellRepository'
import {
  CROSS_SELL_REASON_MAX_LENGTH,
  MAX_CROSS_SELLS,
} from '@/domain/entities/ProductCrossSell'
import { Result, ok, err, AppError } from '@/domain/shared/Result'

export interface CrossSellInputItem {
  relatedId: string
  /** Opcional. Vacío o solo espacios = sin motivo. */
  reason?: string | null
  /** true = también sugerir `productId` en la ficha de `relatedId`. */
  reciprocal?: boolean
}

export interface SetProductCrossSellsInput {
  productId: string
  /** Lista COMPLETA y ordenada: lo que no venga aquí se elimina. */
  items: readonly CrossSellInputItem[]
}

export interface SetProductCrossSellsOutput {
  saved: number
  /** Resultado del sentido inverso, por producto sugerido. */
  reciprocal: {
    /** Ahora también sugieren este producto. */
    added: string[]
    /** Ya lo sugerían: no se tocó nada. */
    alreadyLinked: string[]
    /** Su lista ya tenía el máximo: no se pudo agregar. */
    full: string[]
  }
}

/**
 * Use case: fijar la lista de venta cruzada de un producto.
 *
 * Reglas:
 *   1. Máximo `MAX_CROSS_SELLS` (4) sugerencias.
 *   2. Sin repetidos y sin sugerir un producto a sí mismo.
 *   3. Motivo opcional, máximo 120 caracteres.
 *   4. El producto y todos los sugeridos existen y no están en la papelera.
 *   5. Sentido inverso (opcional, por sugerencia): se AGREGA el producto al final
 *      de la lista del sugerido si hay cupo. Nunca se reemplaza la lista ajena y
 *      nunca se le quita nada. Quitar un vínculo aquí no quita el inverso: cada
 *      dirección es un vínculo independiente.
 *
 * Nunca lanza: devuelve `Result`.
 */
export class SetProductCrossSells {
  constructor(private readonly repo: ICrossSellRepository) {}

  async execute(input: SetProductCrossSellsInput): Promise<Result<SetProductCrossSellsOutput>> {
    const { productId, items } = input

    if (items.length > MAX_CROSS_SELLS) {
      return err(new AppError('VALIDATION_ERROR', `Puedes vincular máximo ${MAX_CROSS_SELLS} productos`))
    }

    const relatedIds = items.map((i) => i.relatedId)
    if (relatedIds.includes(productId)) {
      return err(new AppError('VALIDATION_ERROR', 'Un producto no puede sugerirse a sí mismo'))
    }
    if (new Set(relatedIds).size !== relatedIds.length) {
      return err(new AppError('VALIDATION_ERROR', 'No repitas un producto en la lista'))
    }

    const reasons = items.map((i) => i.reason?.trim() || null)
    if (reasons.some((r) => r !== null && r.length > CROSS_SELL_REASON_MAX_LENGTH)) {
      return err(
        new AppError('VALIDATION_ERROR', `El motivo admite máximo ${CROSS_SELL_REASON_MAX_LENGTH} caracteres`),
      )
    }

    try {
      const existing = new Set(await this.repo.findExistingProductIds([productId, ...relatedIds]))
      if (!existing.has(productId)) {
        return err(new AppError('NOT_FOUND', 'Producto no encontrado'))
      }
      const missing = relatedIds.filter((id) => !existing.has(id))
      if (missing.length > 0) {
        return err(new AppError('VALIDATION_ERROR', 'Alguno de los productos vinculados no existe o está en la papelera'))
      }

      await this.repo.replaceForProduct(
        productId,
        items.map((item, order) => ({ relatedId: item.relatedId, reason: reasons[order] ?? null, order })),
      )

      const reciprocal: SetProductCrossSellsOutput['reciprocal'] = { added: [], alreadyLinked: [], full: [] }
      for (const item of items) {
        if (!item.reciprocal) continue
        const outcome = await this.repo.appendIfRoom(item.relatedId, productId, MAX_CROSS_SELLS)
        if (outcome === 'added') reciprocal.added.push(item.relatedId)
        else if (outcome === 'exists') reciprocal.alreadyLinked.push(item.relatedId)
        else reciprocal.full.push(item.relatedId)
      }

      return ok({ saved: items.length, reciprocal })
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'No se pudieron guardar las sugerencias', e))
    }
  }
}
