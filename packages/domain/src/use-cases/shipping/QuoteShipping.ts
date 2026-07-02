import { Result, ok, err, AppError } from '../../shared/Result'
import { FREE_SHIPPING_THRESHOLD_CENTS } from '../../shared/constants'
import { IProductRepository } from '../../repositories/IProductRepository'
import { IVendeloShippingPort } from '../../repositories/IVendeloShippingPort'

export interface QuoteShippingInput {
  shippingCityCode: string
  shippingSubdivisionCode: string
  items: Array<{ productId: string; quantity: number }>
  paymentMethod: 'COD' | 'EXTERNAL_PAYMENT'
}

export interface QuoteShippingOutput {
  /** Centavos COP que Vendelo cobraría por el envío. 0 si freeShipping aplica. */
  quotedShippingTotal: number
  /** true si el subtotal del carrito alcanza FREE_SHIPPING_THRESHOLD_CENTS. */
  freeShipping: boolean
}

/**
 * Cotiza el costo de envío de un carrito sin crear el pedido.
 *
 * Es puramente informativo: Vendelo cobra el envío directamente al cliente
 * (no pasa por nuestro Wompi), así que esto solo evita que el cliente se
 * sorprenda al recibir el pedido. Por eso, si el subtotal alcanza el umbral
 * de envío gratis, ni siquiera consultamos a Vendelo — devolvemos 0 directo.
 *
 * Anti-tampering: el cliente solo envía productId + quantity. Precio y
 * cantidad disponible siempre se resuelven desde la BD, igual que en CreateOrder.
 */
export class QuoteShipping {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly shippingPort: IVendeloShippingPort,
  ) {}

  async execute(input: QuoteShippingInput): Promise<Result<QuoteShippingOutput, AppError>> {
    if (!input.items.length) {
      return err(new AppError('VALIDATION_ERROR', 'Se requiere al menos un ítem para cotizar'))
    }

    let cartTotal = 0

    const resolvedItems: Array<{
      productId: string
      quantity: number
      weightKg: number | null
      heightCm: number | null
      widthCm: number | null
      lengthCm: number | null
    }> = []

    for (const item of input.items) {
      if (item.quantity <= 0) {
        return err(new AppError('VALIDATION_ERROR', 'La cantidad debe ser mayor a 0'))
      }

      const product = await this.productRepo.findById(item.productId)

      if (!product) {
        return err(new AppError('NOT_FOUND', `Producto "${item.productId}" no encontrado`))
      }
      if (!product.isActive) {
        return err(new AppError('VALIDATION_ERROR', `Producto "${product.name}" no está disponible`))
      }

      cartTotal += product.price * item.quantity
      resolvedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        weightKg: product.weightKg,
        heightCm: product.heightCm,
        widthCm: product.widthCm,
        lengthCm: product.lengthCm,
      })
    }

    const freeShipping = cartTotal >= FREE_SHIPPING_THRESHOLD_CENTS

    if (freeShipping) {
      return ok({ quotedShippingTotal: 0, freeShipping: true })
    }

    try {
      const quote = await this.shippingPort.quoteOrder({
        shippingCityCode: input.shippingCityCode,
        shippingSubdivisionCode: input.shippingSubdivisionCode,
        items: resolvedItems,
        paymentMethod: input.paymentMethod,
      })
      return ok({ quotedShippingTotal: quote.quotedShippingTotal, freeShipping: false })
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'No se pudo cotizar el envío', e))
    }
  }
}
