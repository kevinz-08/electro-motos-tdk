import { Coupon, CouponType, CouponRestriction, CouponScope } from '@/domain/entities/Coupon'
import { CustomerIdentity } from '@/domain/entities/Order'

export interface CreateCouponInput {
  code: string
  type: CouponType
  /** PERCENTAGE: puntos base (1000 = 10.00%). FIXED: centavos COP. */
  value: number
  restriction: CouponRestriction
  scope: CouponScope
  /** Permite usar el cupón sin cuenta. Default false. */
  allowGuest?: boolean
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
  allowGuest?: boolean
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
 *
 * Los usos por cliente se registran en CouponRedemption (RESERVED → CONFIRMED | RELEASED),
 * escritos por IOrderRepository en la misma transacción del pedido.
 */
export interface ICouponRepository {
  findByCode(code: string): Promise<Coupon | null>
  findById(id: string): Promise<Coupon | null>
  findAll(): Promise<Coupon[]>
  /**
   * true si existe un uso RESERVED o CONFIRMED del cupón para el cliente, buscando por
   * userId O por buyerIdKey (los que no sean null). Si ambos son null retorna false.
   */
  hasActiveRedemption(couponId: string, customer: CustomerIdentity): Promise<boolean>
  create(data: CreateCouponInput): Promise<Coupon>
  update(id: string, data: UpdateCouponInput): Promise<Coupon>
  /** Soft delete: pone isActive = false en lugar de borrar la fila. */
  delete(id: string): Promise<void>
}
