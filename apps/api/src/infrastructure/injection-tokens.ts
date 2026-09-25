/**
 * Tokens de inyección de dependencias para las interfaces del dominio.
 *
 * NestJS usa Symbols como tokens cuando el tipo no es inyectable directamente
 * (el caso de interfaces TypeScript, que desaparecen en runtime).
 *
 * Patrón de uso en módulos:
 *   { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository }
 *
 * Patrón de uso en servicios/use cases:
 *   constructor(@Inject(PRODUCT_REPOSITORY) private repo: IProductRepository) {}
 */
export const COUPON_REPOSITORY              = Symbol('ICouponRepository')
export const PRODUCT_REPOSITORY             = Symbol('IProductRepository')
export const PRODUCT_DESCRIPTION_REPOSITORY = Symbol('IProductDescriptionRepository')
export const REVIEW_REPOSITORY              = Symbol('IReviewRepository')
export const ORDER_REPOSITORY               = Symbol('IOrderRepository')
export const USER_REPOSITORY                = Symbol('IUserRepository')
export const INVENTORY_REPOSITORY           = Symbol('IInventorySyncRepository')
export const PAYMENT_SERVICE                = Symbol('IPaymentService')
export const VENDELO_SERVICE                = Symbol('IVendeloService')
export const SHIPMENT_REPOSITORY            = Symbol('IShipmentRepository')
export const VENDELO_SHIPPING_PORT          = Symbol('IVendeloShippingPort')
export const RECIPIENT_TRUST_STRATEGIES     = Symbol('IRecipientTrustStrategy[]')
export const ALERT_NOTIFICATION_PORT        = Symbol('IAlertNotificationPort')
// Sistema de compatibilidad por modelo de moto (docs/seo/, Fase 2)
export const MOTORCYCLE_REPOSITORY          = Symbol('IMotorcycleRepository')
export const FITMENT_REPOSITORY             = Symbol('IFitmentRepository')
export const OEM_REFERENCE_REPOSITORY       = Symbol('IOemReferenceRepository')
// Venta cruzada (docs/seo/plan-venta-cruzada.md)
export const CROSS_SELL_REPOSITORY           = Symbol('ICrossSellRepository')
