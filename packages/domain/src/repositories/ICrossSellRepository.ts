import type { CrossSellLink } from '@/domain/entities/ProductCrossSell'

/** Resultado de intentar agregar un vínculo al final de la lista de un producto. */
export type AppendCrossSellOutcome = 'added' | 'exists' | 'full'

/**
 * Contrato de acceso a datos de la venta cruzada.
 * Implementado por PrismaCrossSellRepository en apps/api.
 */
export interface ICrossSellRepository {
  /** Vínculos de un producto, en el orden en que se muestran. */
  findByProduct(productId: string): Promise<CrossSellLink[]>

  /** Reemplaza TODA la lista de un producto, de forma atómica. */
  replaceForProduct(
    productId: string,
    links: ReadonlyArray<Pick<CrossSellLink, 'relatedId' | 'reason' | 'order'>>,
  ): Promise<void>

  /**
   * Agrega `relatedId` al final de la lista de `productId` solo si aún hay
   * cupo (menos de `max`) y no existe ya. Sirve para el sentido inverso: la
   * lista de un producto ajeno nunca se reemplaza, solo se le agrega.
   */
  appendIfRoom(productId: string, relatedId: string, max: number): Promise<AppendCrossSellOutcome>

  /** De los ids dados, los que existen y no están en la papelera. */
  findExistingProductIds(ids: readonly string[]): Promise<string[]>
}
