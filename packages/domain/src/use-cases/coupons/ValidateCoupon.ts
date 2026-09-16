import { ICouponRepository } from '@/domain/repositories/ICouponRepository'
import { IOrderRepository } from '@/domain/repositories/IOrderRepository'
import { isCouponExpired, calculateDiscount, CouponRestriction } from '@/domain/entities/Coupon'
import { CustomerIdentity } from '@/domain/entities/Order'
import { Result, ok, err, AppError } from '@/domain/shared/Result'

export interface ValidateCouponItem {
  productId: string
  categoryId: string
  /** null si el producto pertenece a una categoría raíz (sin padre). */
  parentCategoryId: string | null
  /** Precio unitario en centavos COP. */
  price: number
  quantity: number
}

export interface ValidateCouponInput {
  code: string
  /** null = invitado (guest checkout). */
  userId: string | null
  /**
   * Documento normalizado (normalizeBuyerIdKey). Obligatorio para invitados con cupones
   * ONCE_PER_CUSTOMER; opcional para usuarios (si llega, también se valida por documento).
   */
  buyerIdKey?: string | null
  items: ValidateCouponItem[]
}

export interface ValidateCouponOutput {
  /** Monto a descontar en centavos COP, calculado sobre el subtotal elegible. */
  discount: number
  /** IDs de los productos del carrito cubiertos por este cupón. */
  eligibleProductIds: string[]
  couponId: string
  restriction: CouponRestriction
}

/** Mensajes estables — el checkout los muestra junto a un CTA de login/registro (status 403). */
export const COUPON_REQUIRES_ACCOUNT_MESSAGE = 'Inicia sesión o crea una cuenta para usar este cupón'
export const COUPON_FIRST_PURCHASE_REQUIRES_ACCOUNT_MESSAGE = 'El cupón de primera compra requiere crear una cuenta'

/**
 * Use case: Validar un cupón y calcular el descuento aplicable.
 *
 * Orden de validación:
 *   1. El cupón existe.
 *   2. isActive = true (desactivación manual del admin).
 *   3. No expiró (evaluación lazy — sin cron job).
 *   4. Invitados (README §22.5): solo cupones con allowGuest y nunca FIRST_PURCHASE → FORBIDDEN.
 *   5. Restricción por cliente, identificando al cliente por userId Y/O documento:
 *        ONCE_PER_CUSTOMER → sin usos activos (CouponRedemption RESERVED/CONFIRMED).
 *                            Un invitado debe enviar su documento.
 *        FIRST_PURCHASE    → sin pedidos aprobados por userId ni por documento.
 *   6. Al menos un ítem del carrito está dentro del scope del cupón.
 *
 * Scope con cascada jerárquica:
 *   STORE    → todos los ítems son elegibles.
 *   CATEGORY → cubre productos cuya categoría está en coupon.categoryIds,
 *              O cuya categoría padre está en coupon.categoryIds.
 *   PRODUCT  → cubre solo ese producto exacto.
 *
 * El descuento se calcula sobre el subtotal elegible (solo ítems cubiertos),
 * no sobre el total del carrito completo.
 */
export class ValidateCoupon {
  constructor(
    private readonly couponRepo: ICouponRepository,
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: ValidateCouponInput): Promise<Result<ValidateCouponOutput>> {
    const coupon = await this.couponRepo.findByCode(input.code)

    if (!coupon) {
      return err(new AppError('NOT_FOUND', 'Cupón no encontrado'))
    }
    if (!coupon.isActive) {
      return err(new AppError('VALIDATION_ERROR', 'Cupón desactivado'))
    }
    if (isCouponExpired(coupon, new Date())) {
      return err(new AppError('VALIDATION_ERROR', 'Cupón vencido'))
    }

    const isGuest = input.userId === null
    if (isGuest) {
      if (coupon.restriction === 'FIRST_PURCHASE') {
        return err(new AppError('FORBIDDEN', COUPON_FIRST_PURCHASE_REQUIRES_ACCOUNT_MESSAGE))
      }
      if (!coupon.allowGuest) {
        return err(new AppError('FORBIDDEN', COUPON_REQUIRES_ACCOUNT_MESSAGE))
      }
    }

    const customer: CustomerIdentity = {
      userId: input.userId,
      buyerIdKey: input.buyerIdKey ? input.buyerIdKey : null,
    }

    if (coupon.restriction === 'ONCE_PER_CUSTOMER') {
      if (isGuest && !customer.buyerIdKey) {
        return err(new AppError('VALIDATION_ERROR', 'Ingresa tu número de documento para aplicar este cupón'))
      }
      if (await this.couponRepo.hasActiveRedemption(coupon.id, customer)) {
        return err(new AppError('VALIDATION_ERROR', 'Ya utilizaste este cupón'))
      }
    }

    if (coupon.restriction === 'FIRST_PURCHASE') {
      if (await this.orderRepo.hasApprovedOrders(customer)) {
        return err(new AppError('VALIDATION_ERROR', 'Este cupón es exclusivo para tu primera compra'))
      }
    }

    const eligibleItems = input.items.filter(item => {
      if (coupon.scope === 'STORE') return true
      if (coupon.scope === 'PRODUCT') return item.productId === coupon.productId
      // CATEGORY: cascade — item's direct category or its parent must be in categoryIds
      return (
        coupon.categoryIds.includes(item.categoryId) ||
        (item.parentCategoryId !== null && coupon.categoryIds.includes(item.parentCategoryId))
      )
    })

    if (eligibleItems.length === 0) {
      return err(new AppError('VALIDATION_ERROR', 'Este cupón no aplica a los productos en tu carrito'))
    }

    const eligibleSubtotal = eligibleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    )
    const discount = calculateDiscount(coupon, eligibleSubtotal)

    return ok({
      discount,
      eligibleProductIds: eligibleItems.map(item => item.productId),
      couponId: coupon.id,
      restriction: coupon.restriction,
    })
  }
}
