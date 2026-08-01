import { Coupon, CouponType, CouponRestriction, CouponScope } from '@/domain/entities/Coupon'

export interface CreateCouponInput {
  code: string
  type: CouponType
  /** PERCENTAGE: puntos base (1000 = 10.00%). FIXED: centavos COP. */
  value: number
  restriction: CouponRestriction
  scope: CouponScope
  expiresAt: Date
  /** IDs de categorías — requerido cuando scope === CATEGORY. */
  categoryIds?: string[]
  /** ID del producto — requerido cuando scope === PRODUCT. */
  productId?: string
}

export interface UpdateCouponInput {
  code?: string
  type?: CouponType
  value?: number
  restriction?: CouponRestriction
  scope?: CouponScope
  expiresAt?: Date
  /** Reemplaza todas las categorías del cupón. null para limpiar. */
  categoryIds?: string[] | null
  /** null para limpiar el scope de producto. */
  productId?: string | null
  isActive?: boolean
}

/**
 * Contrato de acceso a datos de cupones.
 * Implementado por PrismaCouponRepository en infrastructure/repositories/.
 *
 * Sin método incrementUsage: la vigencia se controla exclusivamente por expiresAt
 * (evaluación lazy en ValidateCoupon). No hay contadores globales.
 */
export interface ICouponRepository {
  findByCode(code: string): Promise<Coupon | null>
  findAll(): Promise<Coupon[]>
  create(data: CreateCouponInput): Promise<Coupon>
  update(id: string, data: UpdateCouponInput): Promise<Coupon>
  /** Soft delete: pone isActive = false en lugar de borrar la fila. */
  delete(id: string): Promise<void>
}
