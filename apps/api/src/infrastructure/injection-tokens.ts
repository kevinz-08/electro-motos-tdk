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
export const PRODUCT_REPOSITORY             = Symbol('IProductRepository')
export const PRODUCT_DESCRIPTION_REPOSITORY = Symbol('IProductDescriptionRepository')
export const ORDER_REPOSITORY               = Symbol('IOrderRepository')
export const USER_REPOSITORY                = Symbol('IUserRepository')
export const INVENTORY_REPOSITORY           = Symbol('IInventorySyncRepository')
export const PAYMENT_SERVICE                = Symbol('IPaymentService')
export const VENDELO_SERVICE                = Symbol('IVendeloService')
