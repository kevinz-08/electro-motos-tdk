import { IOrderRepository, CreateOrderInput } from '@/domain/repositories/IOrderRepository'
import { IProductRepository } from '@/domain/repositories/IProductRepository'
import { IPaymentService, PaymentResult } from '@/domain/services/IPaymentService'
import { Order, ShippingAddress, BuyerInfo, PaymentProvider } from '@/domain/entities/Order'
import { Result, ok, err, AppError } from '@/domain/shared/Result'

export interface CreateOrderUseCaseInput {
  userId: string
  // Intencionalmente sin `price`: el precio siempre se lee de la BD en el use case
  // para prevenir manipulación de precios desde el cliente.
  items: Array<{ productId: string; quantity: number }>
  shippingAddress: ShippingAddress
  buyer: BuyerInfo
  paymentProvider: PaymentProvider
}

export interface CreateOrderOutput {
  order: Order
  payment: PaymentResult | null
}

/**
 * Use case: Crear un pedido y preparar el pago.
 *
 * Flujo para pasarelas online (WOMPI/MERCADO_PAGO):
 *   1. Para cada ítem: validar cantidad > 0, buscar el producto, verificar que esté activo,
 *      verificar que haya stock suficiente.
 *   2. Calcular el total sumando precio × cantidad de cada ítem.
 *   3. Crear el pedido en la BD con estado PENDING.
 *   4. Llamar a la pasarela de pago para preparar la transacción.
 *   5. Retornar el pedido + los datos de la transacción (referencia, firma, etc.)
 *
 * IMPORTANTE: El stock NO se descuenta aquí para pagos online. Se descuenta en
 * ConfirmPayment cuando el webhook de la pasarela confirma que el pago fue APPROVED.
 * Razón: si se descontase aquí y el cliente abandona el pago, el stock quedaría
 * reducido incorrectamente.
 *
 * Flujo para COD (pago contra entrega):
 *   No hay pasarela ni webhook que confirme el pago — el pedido se confirma al
 *   crearse. Se inserta directamente con estado PAID y el stock se descuenta en
 *   la misma transacción (`createPaidOrder`), evitando que el pedido quede
 *   colgado en PENDING (sujeto al cleanup de pedidos abandonados). `payment` en
 *   el output es `null`: no hay datos de transacción de pasarela que devolver.
 *
 * Este use case recibe las dependencias como parámetros del constructor
 * (inyección de dependencias), lo que facilita las pruebas unitarias con mocks.
 */
export class CreateOrder {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
    private readonly paymentService: IPaymentService,
  ) {}

  async execute(input: CreateOrderUseCaseInput): Promise<Result<CreateOrderOutput>> {
    // 1. Validar stock y calcular total
    const resolvedItems: Array<{
      productId: string
      quantity: number
      priceAtPurchase: number
    }> = []

    let total = 0

    for (const item of input.items) {
      if (item.quantity <= 0) {
        return err(new AppError('VALIDATION_ERROR', 'La cantidad debe ser mayor a 0'))
      }

      const found = await this.productRepo.findById(item.productId)

      if (!found) {
        return err(new AppError('NOT_FOUND', `Producto "${item.productId}" no encontrado`))
      }
      if (!found.isActive) {
        return err(new AppError('VALIDATION_ERROR', `Producto "${found.name}" no está disponible`))
      }
      if (found.stock < item.quantity) {
        return err(
          new AppError(
            'STOCK_UNAVAILABLE',
            `Stock insuficiente para "${found.name}". Disponible: ${found.stock}`,
          ),
        )
      }

      resolvedItems.push({
        productId: found.id,
        quantity: item.quantity,
        priceAtPurchase: found.price,
      })
      total += found.price * item.quantity
    }

    const createInput = {
      userId: input.userId,
      items: resolvedItems,
      shippingAddress: input.shippingAddress,
      buyer: input.buyer,
      paymentProvider: input.paymentProvider,
      total,
    }

    // COD: no hay pasarela que esperar — el pedido se crea ya PAID y con el
    // stock descontado en la misma transacción.
    if (input.paymentProvider === 'COD') {
      let order: Order
      try {
        order = await this.orderRepo.createPaidOrder(createInput)
      } catch (e) {
        return err(new AppError('INTERNAL_ERROR', 'Error al crear el pedido', e))
      }
      return ok({ order, payment: null })
    }

    // 2. Crear orden en DB con estado PENDING
    let order: Order
    try {
      order = await this.orderRepo.create(createInput)
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'Error al crear el pedido', e))
    }

    // 3. Iniciar transacción en la pasarela
    let paymentResult: PaymentResult
    try {
      paymentResult = await this.paymentService.createTransaction(order)
    } catch (e) {
      return err(new AppError('PAYMENT_ERROR', 'Error al iniciar el pago', e))
    }

    return ok({ order, payment: paymentResult })
  }
}
