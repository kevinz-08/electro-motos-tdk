import { Injectable } from '@nestjs/common'
import type { Prisma } from '@h2r/database'
import {
  IOrderRepository,
  CreateOrderInput,
  PaymentTransitionResult,
  ActiveVendeloOrder,
  Order,
  OrderStatus,
  OrderItem,
  Payment,
  ShippingAddress,
  BuyerIdType,
  PaymentProvider,
  PaymentStatus,
  ShipmentStatus,
  DeliveryMethod,
  CustomerIdentity,
  AppError,
} from '@h2r/domain'
import { PrismaService } from '../database/prisma.service'

type PrismaOrderRow = {
  id: string; userId: string | null; contactEmail: string; buyerIdKey: string; status: string; total: number
  shippingAddress: unknown; paymentProvider: string; shippingTotal: number; createdAt: Date
  deliveryMethod: string
  buyerIdType: string; buyerIdNumber: string; buyerBusinessName: string | null
  items?: Array<{ id: string; orderId: string; productId: string; quantity: number; priceAtPurchase: number; compareAtPriceAtPurchase: number | null }>
  payment?: { id: string; orderId: string; provider: string; externalId: string | null; status: string; amount: number; createdAt: Date } | null
}

function toDomainItem(i: NonNullable<PrismaOrderRow['items']>[number]): OrderItem {
  return {
    id: i.id,
    orderId: i.orderId,
    productId: i.productId,
    quantity: i.quantity,
    priceAtPurchase: i.priceAtPurchase,
    compareAtPriceAtPurchase: i.compareAtPriceAtPurchase,
  }
}

function toDomainPayment(p: NonNullable<NonNullable<PrismaOrderRow['payment']>>): Payment {
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

function toDomain(o: PrismaOrderRow): Order {
  return {
    id: o.id,
    userId: o.userId,
    contactEmail: o.contactEmail,
    buyerIdKey: o.buyerIdKey,
    status: o.status as OrderStatus,
    total: o.total,
    shippingTotal: o.shippingTotal,
    shippingAddress: o.shippingAddress as unknown as ShippingAddress,
    deliveryMethod: o.deliveryMethod as DeliveryMethod,
    buyer: {
      idType: o.buyerIdType as BuyerIdType,
      idNumber: o.buyerIdNumber,
      businessName: o.buyerBusinessName ?? undefined,
    },
    paymentProvider: o.paymentProvider as PaymentProvider,
    createdAt: o.createdAt,
    items: o.items?.map(toDomainItem),
    payment: o.payment ? toDomainPayment(o.payment) : undefined,
  }
}

/** Datos del uso de cupón para el nested create del pedido (ver CreateOrderInput.couponRedemption). */
function couponRedemptionCreate(input: CreateOrderInput, status: 'RESERVED' | 'CONFIRMED') {
  if (!input.couponRedemption) return undefined
  const { couponId, enforceUnique } = input.couponRedemption
  return {
    create: {
      couponId,
      userId: input.userId,
      buyerIdKey: input.buyerIdKey,
      status,
      activeUniqueKey: enforceUnique && input.buyerIdKey ? `${couponId}:${input.buyerIdKey}` : null,
    },
  }
}

/**
 * Al crear un pedido el único @unique que puede chocar es CouponRedemption.activeUniqueKey
 * (orderId e id son nuevos) — el mismo documento ya tiene un uso activo del cupón.
 */
function rethrowCouponConflict(e: unknown): never {
  if (typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002') {
    throw new AppError('VALIDATION_ERROR', 'Ya utilizaste este cupón', e)
  }
  throw e
}

/** Filtro OR por userId / buyerIdKey (los que no sean null). null si no hay identidad. */
function customerFilter(customer: CustomerIdentity): Array<{ userId: string } | { buyerIdKey: string }> | null {
  const or: Array<{ userId: string } | { buyerIdKey: string }> = []
  if (customer.userId) or.push({ userId: customer.userId })
  if (customer.buyerIdKey) or.push({ buyerIdKey: customer.buyerIdKey })
  return or.length > 0 ? or : null
}

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Order | null> {
    const o = await this.prisma.client.order.findUnique({
      where: { id },
      include: { items: true, payment: true },
    })
    return o ? toDomain(o) : null
  }

  async findByUserId(userId: string): Promise<Order[]> {
    const orders = await this.prisma.client.order.findMany({
      where: { userId },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    })
    return orders.map(toDomain)
  }

  async findAll(filters?: { status?: OrderStatus; page?: number; limit?: number }): Promise<Order[]> {
    const page  = filters?.page  ?? 1
    const limit = filters?.limit ?? 20
    const skip  = (page - 1) * limit

    const orders = await this.prisma.client.order.findMany({
      where: filters?.status ? { status: filters.status } : undefined,
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })
    return orders.map(toDomain)
  }

  /** Cuenta pedidos que matchean los mismos filtros que `findAll`, sin paginar. */
  async countAll(filters?: { status?: OrderStatus }): Promise<number> {
    return this.prisma.client.order.count({
      where: filters?.status ? { status: filters.status } : undefined,
    })
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const o = await this.prisma.client.order.create({
      data: {
        userId: input.userId,
        contactEmail: input.contactEmail,
        buyerIdKey: input.buyerIdKey,
        total: input.total,
        shippingAddress: input.shippingAddress as unknown as Prisma.InputJsonValue,
        deliveryMethod: input.deliveryMethod,
        buyerIdType: input.buyer.idType,
        buyerIdNumber: input.buyer.idNumber,
        buyerBusinessName: input.buyer.businessName ?? null,
        paymentProvider: input.paymentProvider,
        shippingTotal: input.shippingTotal,
        couponCode: input.couponCode ?? null,
        discountAmount: input.discountAmount ?? 0,
        items: { create: input.items },
        payment: {
          create: { provider: input.paymentProvider, amount: input.total },
        },
        couponRedemption: couponRedemptionCreate(input, 'RESERVED'),
      },
      include: { items: true, payment: true },
    }).catch(rethrowCouponConflict)
    return toDomain(o)
  }

  async createPaidOrder(input: CreateOrderInput): Promise<Order> {
    const o = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: input.userId,
          contactEmail: input.contactEmail,
          buyerIdKey: input.buyerIdKey,
          status: 'PAID',
          total: input.total,
          shippingAddress: input.shippingAddress as unknown as Prisma.InputJsonValue,
          deliveryMethod: input.deliveryMethod,
          buyerIdType: input.buyer.idType,
          buyerIdNumber: input.buyer.idNumber,
          buyerBusinessName: input.buyer.businessName ?? null,
          paymentProvider: input.paymentProvider,
          shippingTotal: input.shippingTotal,
          couponCode: input.couponCode ?? null,
          discountAmount: input.discountAmount ?? 0,
          items: { create: input.items },
          payment: {
            create: { provider: input.paymentProvider, amount: input.total, status: 'APPROVED' },
          },
          couponRedemption: couponRedemptionCreate(input, 'CONFIRMED'),
        },
        include: { items: true, payment: true },
      })

      for (const { productId, quantity } of input.items) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { decrement: quantity }, soldCount: { increment: quantity } },
        })
      }

      return created
    }).catch(rethrowCouponConflict)
    return toDomain(o)
  }

  async restockItems(orderId: string): Promise<void> {
    await this.prisma.client.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({ where: { orderId } })
      for (const { productId, quantity } of items) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: quantity }, soldCount: { decrement: quantity } },
        })
      }
    })
  }

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    if (status !== 'CANCELLED') {
      await this.prisma.client.order.update({ where: { id }, data: { status } })
      return
    }
    // Pedido cancelado: el cliente puede volver a usar el cupón.
    await this.prisma.client.$transaction([
      this.prisma.client.order.update({ where: { id }, data: { status } }),
      this.prisma.client.couponRedemption.updateMany({
        where: { orderId: id, status: { not: 'RELEASED' } },
        data: { status: 'RELEASED', activeUniqueKey: null },
      }),
    ])
  }

  async updatePaymentExternalId(orderId: string, externalId: string): Promise<void> {
    await this.prisma.client.payment.update({ where: { orderId }, data: { externalId } })
  }

  async transitionFromPending(
    orderId: string,
    to: {
      orderStatus: OrderStatus
      paymentStatus: PaymentStatus
      externalId: string
      stockDecrements?: Array<{ productId: string; quantity: number }>
    },
  ): Promise<PaymentTransitionResult> {
    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: to.orderStatus },
      })
      if (updated.count === 0) return { applied: false }

      await tx.payment.update({
        where: { orderId },
        data: { status: to.paymentStatus, externalId: to.externalId },
      })

      if (to.orderStatus === 'PAID') {
        await tx.couponRedemption.updateMany({
          where: { orderId, status: 'RESERVED' },
          data: { status: 'CONFIRMED' },
        })
      } else if (to.orderStatus === 'CANCELLED') {
        await tx.couponRedemption.updateMany({
          where: { orderId, status: { not: 'RELEASED' } },
          data: { status: 'RELEASED', activeUniqueKey: null },
        })
      }

      if (to.stockDecrements?.length) {
        for (const { productId, quantity } of to.stockDecrements) {
          await tx.product.update({
            where: { id: productId },
            data: { stock: { decrement: quantity }, soldCount: { increment: quantity } },
          })
        }
      }

      return { applied: true }
    })
  }

  /**
   * Ingresos del día actual: cualquier pedido confirmado (status distinto de
   * PENDING/CANCELLED) — un pedido sigue "pagado" al pasar a SHIPPED/DELIVERED.
   */
  async getTodayRevenue(): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result = await this.prisma.client.order.aggregate({
      where: { status: { notIn: ['PENDING', 'CANCELLED'] }, createdAt: { gte: today } },
      _sum: { total: true },
    })
    return result._sum.total ?? 0
  }

  async getPendingCount(): Promise<number> {
    return this.prisma.client.order.count({ where: { status: 'PENDING' } })
  }

  async findVendeloOrderIdsBatch(
    orderIds: string[],
  ): Promise<Array<{ id: string; vendeloOrderId: string | null }>> {
    const rows = await this.prisma.client.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, vendeloOrderId: true },
    })
    return rows.map((r) => ({ id: r.id, vendeloOrderId: r.vendeloOrderId }))
  }

  async hasApprovedOrders(customer: CustomerIdentity): Promise<boolean> {
    const or = customerFilter(customer)
    if (!or) return false
    const order = await this.prisma.client.order.findFirst({
      where: { OR: or, status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
      select: { id: true },
    })
    return order !== null
  }

  async findActiveVendeloOrders(limit: number): Promise<ActiveVendeloOrder[]> {
    const rows = await this.prisma.client.order.findMany({
      where: {
        vendeloOrderId: { not: null },
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
        OR: [
          { shipment: null },
          { shipment: { status: { notIn: ['DELIVERED', 'RETURNED', 'CANCELLED'] } } },
        ],
      },
      select: {
        id: true,
        vendeloOrderId: true,
        shipment: { select: { status: true, updatedAt: true } },
      },
      // ASC NULLS FIRST: pedidos sin shipment van primero, luego los más antiguos.
      // Prisma no expone NULLS FIRST, pero como NULL implícito se ordena al inicio
      // en PostgreSQL ASC, el comportamiento es el correcto.
      orderBy: { shipment: { updatedAt: 'asc' } },
      take: limit,
    })

    return rows
      .filter((r): r is typeof r & { vendeloOrderId: string } => r.vendeloOrderId !== null)
      .map((r) => ({
        orderId: r.id,
        vendeloOrderId: r.vendeloOrderId,
        currentShipmentStatus: (r.shipment?.status as ShipmentStatus | undefined) ?? null,
      }))
  }
}
