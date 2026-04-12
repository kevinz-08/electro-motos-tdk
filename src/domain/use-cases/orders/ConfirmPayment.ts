import { IOrderRepository } from '@/domain/repositories/IOrderRepository'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { PaymentStatus } from '@/domain/entities/Order'
import { Result, ok, err, AppError } from '@/domain/shared/Result'

export interface ConfirmPaymentInput {
  orderId: string
  externalId: string
  status: PaymentStatus
}

/**
 * Use case: Confirmar o rechazar un pago a partir del webhook de la pasarela.
 *
 * Flujo:
 *   1. Buscar el pedido por su ID. Si no existe, retornar error NOT_FOUND.
 *   2. Verificar idempotencia: si el pedido ya no está en PENDING, no hacer nada.
 *      (Wompi puede enviar el mismo webhook más de una vez como reintento.)
 *   3. Registrar el externalId de la transacción en el registro de Payment.
 *   4. Según el status del pago:
 *      - APPROVED  → Order.status = PAID + descuenta stock de cada ítem
 *      - DECLINED/VOIDED/ERROR → Order.status = CANCELLED
 *      - PENDING   → no hace nada (el pago aún no se resuelve)
 *
 * Por qué confiar solo en el webhook y no en la redirect_url:
 *   La redirect_url es controlable por el usuario (puede modificar los params en la URL).
 *   El webhook llega directamente de la pasarela a nuestro servidor, sin pasar por el cliente.
 *   Es la única fuente de verdad del estado del pago.
 *
 * Llamado desde:
 *   - POST /api/payments/wompi/webhook
 *   - POST /api/payments/mercadopago/webhook
 */
export class ConfirmPayment {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  async execute(input: ConfirmPaymentInput): Promise<Result<void>> {
    const order = await this.orderRepo.findById(input.orderId)
    if (!order) {
      return err(new AppError('NOT_FOUND', `Pedido "${input.orderId}" no encontrado`))
    }

    // Idempotencia: si el pedido ya fue procesado, no hacer nada
    if (order.status !== 'PENDING') {
      return ok(undefined)
    }

    try {
      await this.orderRepo.updatePaymentExternalId(input.orderId, input.externalId)

      if (input.status === 'APPROVED') {
        await this.orderRepo.updateStatus(input.orderId, 'PAID')

        // Descontar stock de cada ítem
        if (order.items) {
          for (const item of order.items) {
            const product = await this.productRepo.findBySlug(item.productId)
            // Buscamos el producto para obtener stock actual
            // El repositorio expone updateStock con ID del producto
            const newStock = Math.max(0, (product?.stock ?? 0) - item.quantity)
            await this.productRepo.updateStock(item.productId, newStock)
          }
        }
      } else if (
        input.status === 'DECLINED' ||
        input.status === 'VOIDED' ||
        input.status === 'ERROR'
      ) {
        await this.orderRepo.updateStatus(input.orderId, 'CANCELLED')
      }

      return ok(undefined)
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'Error al confirmar el pago', e))
    }
  }
}
