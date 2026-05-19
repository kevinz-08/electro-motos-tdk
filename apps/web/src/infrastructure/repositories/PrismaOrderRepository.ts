/**
 * Implementación de IOrderRepository usando Prisma 7 + PostgreSQL (Neon).
 *
 * La dirección de envío (shippingAddress) se almacena como JSON en PostgreSQL.
 * Al leer, se castea a ShippingAddress. Al escribir, a Prisma.InputJsonValue.
 * Prisma 7 no tiene conversión automática de tipos JSON — el cast es explícito y necesario.
 */
import {
  prisma,
  Prisma,
  type OrderModel as PrismaOrder,
  type OrderItemModel as PrismaItem,
  type PaymentModel as PrismaPayment,
} from '@h2r/database'
import {
  IOrderRepository,
  CreateOrderInput,
  PaymentTransitionResult,
  Order,
  OrderStatus,
  OrderItem,
  Payment,
  ShippingAddress,
  PaymentProvider,
  PaymentStatus,
} from '@h2r/domain'

/** Mapea un ítem de Prisma a la entidad de dominio OrderItem */
function toDomainItem(i: PrismaItem): OrderItem {
  return {
    id: i.id,
    orderId: i.orderId,
    productId: i.productId,
    quantity: i.quantity,
    priceAtPurchase: i.priceAtPurchase, // centavos COP capturados al crear el pedido
  }
}

/** Mapea un pago de Prisma a la entidad de dominio Payment */
function toDomainPayment(p: PrismaPayment): Payment {
  return {
    id: p.id,
    orderId: p.orderId,
    provider: p.provider as PaymentProvider,
    externalId: p.externalId,
    status: p.status as PaymentStatus,
    amount: p.amount,
    createdAt: p.createdAt,
  }
}

/**
 * Mapea un pedido de Prisma (con ítems y pago incluidos) a la entidad de dominio Order.
 * El cast `as unknown as ShippingAddress` es necesario porque Prisma modela
 * los campos JSON como `JsonValue`, no como el tipo de dominio específico.
 */
function toDomain(
  o: PrismaOrder & { items?: PrismaItem[]; payment?: PrismaPayment | null },
): Order {
  return {
    id: o.id,
    userId: o.userId,
    status: o.status as OrderStatus,
    total: o.total,
    shippingAddress: o.shippingAddress as unknown as ShippingAddress,
    paymentProvider: o.paymentProvider as PaymentProvider,
    createdAt: o.createdAt,
    items: o.items?.map(toDomainItem),
    payment: o.payment ? toDomainPayment(o.payment) : undefined,
  }
}

/** Implementación de acceso a datos de pedidos con Prisma */
export class PrismaOrderRepository implements IOrderRepository {

  /** Busca un pedido por su ID, incluyendo ítems y pago (necesario para webhooks) */
  async findById(id: string): Promise<Order | null> {
    const o = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true },
    })
    return o ? toDomain(o) : null
  }

  /** Retorna todos los pedidos de un usuario ordenados por fecha descendente */
  async findByUserId(userId: string): Promise<Order[]> {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    })
    return orders.map(toDomain)
  }

  /**
   * Lista pedidos con filtros opcionales para el panel admin.
   * Soporta filtro por estado y paginación.
   */
  async findAll(filters?: { status?: OrderStatus; page?: number; limit?: number }): Promise<Order[]> {
    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 20
    const skip = (page - 1) * limit

    const orders = await prisma.order.findMany({
      where: filters?.status ? { status: filters.status } : undefined,
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })
    return orders.map(toDomain)
  }

  /**
   * Crea un pedido con sus ítems y el registro de pago en una sola transacción de Prisma.
   * El pago se crea con estado PENDING — se actualiza mediante webhook cuando la pasarela confirma.
   * La dirección de envío se serializa a JSON con el cast necesario para Prisma 7.
   */
  async create(input: CreateOrderInput): Promise<Order> {
    const o = await prisma.order.create({
      data: {
        userId: input.userId,
        total: input.total,
        // Cast necesario: ShippingAddress → Prisma.InputJsonValue (tipo opaco de Prisma para JSON)
        shippingAddress: input.shippingAddress as unknown as Prisma.InputJsonValue,
        paymentProvider: input.paymentProvider,
        items: {
          create: input.items, // { productId, quantity, priceAtPurchase }[]
        },
        payment: {
          create: {
            provider: input.paymentProvider,
            amount: input.total,
            // externalId queda null hasta que la pasarela confirme via webhook
          },
        },
      },
      include: { items: true, payment: true },
    })
    return toDomain(o)
  }

  /** Actualiza el estado del pedido (PENDING → PAID → SHIPPED → DELIVERED, o CANCELLED) */
  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await prisma.order.update({ where: { id }, data: { status } })
  }

  /**
   * Registra el ID de transacción externo en el Payment.
   * Se llama desde ConfirmPayment cuando llega el webhook de la pasarela.
   */
  async updatePaymentExternalId(orderId: string, externalId: string): Promise<void> {
    await prisma.payment.update({
      where: { orderId },
      data: { externalId },
    })
  }

  /**
   * Transición atómica PENDING → orderStatus con actualización consistente de Payment.
   *
   * La operación usa `updateMany` con `status: 'PENDING'` como condición, de modo que
   * solo el primer webhook que llegue aplica el cambio. Los reintentos posteriores
   * reciben `applied: false` (idempotencia real a nivel de BD, sin race con findById).
   *
   * Se envuelve en `$transaction` para que Order y Payment queden siempre en sincronía.
   */
  async transitionFromPending(
    orderId: string,
    to: {
      orderStatus: OrderStatus
      paymentStatus: PaymentStatus
      externalId: string
      stockDecrements?: Array<{ productId: string; quantity: number }>
    },
  ): Promise<PaymentTransitionResult> {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: to.orderStatus },
      })
      if (updated.count === 0) {
        return { applied: false }
      }
      await tx.payment.update({
        where: { orderId },
        data: { status: to.paymentStatus, externalId: to.externalId },
      })
      return { applied: true }
    })
  }

  /**
   * Calcula los ingresos del día actual (pedidos con status PAID).
   * Retorna el total en centavos COP. Usado en el dashboard admin.
   */
  async getTodayRevenue(): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // inicio del día local

    const result = await prisma.order.aggregate({
      where: {
        status: 'PAID',
        createdAt: { gte: today },
      },
      _sum: { total: true },
    })
    return result._sum.total ?? 0
  }

  /** Cuenta pedidos con status PENDING (sin pago confirmado). Para alertas en dashboard. */
  async getPendingCount(): Promise<number> {
    return prisma.order.count({ where: { status: 'PENDING' } })
  }
}
