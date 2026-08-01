export type CouponType = 'PERCENTAGE' | 'FIXED'

/**
 * Restricción de uso por cliente:
 *   NONE              — cualquier cliente, múltiples veces durante la vigencia.
 *   ONCE_PER_CUSTOMER — cada cliente puede aplicarlo solo una vez.
 *   FIRST_PURCHASE    — solo clientes sin órdenes aprobadas previas.
 */
export type CouponRestriction = 'NONE' | 'ONCE_PER_CUSTOMER' | 'FIRST_PURCHASE'

/**
 * Alcance del cupón (excluyente):
 *   STORE    — aplica a toda la tienda (todos los productos).
 *   CATEGORY — aplica a una o más categorías y sus subcategorías en cascada.
 *   PRODUCT  — aplica a un producto específico.
 */
export type CouponScope = 'STORE' | 'CATEGORY' | 'PRODUCT'

/**
 * Cupón de descuento administrado desde /admin/cupones.
 *
 * Expiración: se evalúa de forma lazy en ValidateCoupon (sin cron job).
 * Desactivación manual: isActive = false (soft delete — nunca se borra la fila).
 */
export interface Coupon {
  id: string
  code: string
  type: CouponType
  /** PERCENTAGE: puntos base (1000 = 10.00%). FIXED: centavos COP. */
  value: number
  restriction: CouponRestriction
  scope: CouponScope
  isActive: boolean
  expiresAt: Date
  createdAt: Date
  /** IDs de categorías cubiertas — vacío si scope !== CATEGORY. */
  categoryIds: string[]
  productId: string | null
}

export function isCouponExpired(coupon: Coupon, now: Date): boolean {
  return coupon.expiresAt < now
}

/**
 * Calcula el descuento sobre el subtotal elegible (solo los ítems cubiertos por el cupón).
 * FIXED: el descuento nunca supera el subtotal elegible para evitar totales negativos.
 */
export function calculateDiscount(coupon: Coupon, eligibleSubtotal: number): number {
  if (coupon.type === 'PERCENTAGE') {
    return Math.round(eligibleSubtotal * (coupon.value / 10000))
  }
  return Math.min(coupon.value, eligibleSubtotal)
}
