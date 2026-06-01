import { Injectable } from '@nestjs/common'
import type { Prisma } from '@h2r/database'
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
import { PrismaService } from '../database/prisma.service'

type PrismaOrderRow = {
  id: string; userId: string; status: string; total: number
  shippingAddress: unknown; paymentProvider: string; createdAt: Date
  items?: Array<{ id: string; orderId: string; productId: string; quantity: number; priceAtPurchase: number }>
  payment?: { id: string; orderId: string; provider: string; externalId: string | null; status: string; amount: number; createdAt: Date } | null
}

function toDomainItem(i: NonNullable<PrismaOrderRow['items']>[number]): OrderItem {
  return {
    id: i.id,
    orderId: i.orderId,
    productId: i.productId,
    quantity: i.quantity,
    priceAtPurchase: i.priceAtPurchase,
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
    status: o.status as OrderStatus,
    total: o.total,
    shippingAddress: o.shippingAddress as unknown as ShippingAddress,
    paymentProvider: o.paymentProvider as PaymentProvider,
    createdAt: o.createdAt,
    items: o.items?.map(toDomainItem),
    payment: o.payment ? toDomainPayment(o.payment) : undefined,
  }
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

  async create(input: CreateOrderInput): Promise<Order> {
    const o = await this.prisma.client.order.create({
      data: {
        userId: input.userId,
        total: input.total,
        shippingAddress: input.shippingAddress as unknown as Prisma.InputJsonValue,
        paymentProvider: input.paymentProvider,
        items: { create: input.items },
        payment: {
          create: { provider: input.paymentProvider, amount: input.total },
        },
      },
      include: { items: true, payment: true },
    })
    return toDomain(o)
  }

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await this.prisma.client.order.update({ where: { id }, data: { status } })
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

      if (to.stockDecrements?.length) {
        for (const { productId, quantity } of to.stockDecrements) {
          await tx.product.update({
            where: { id: productId },
            data: { stock: { decrement: quantity } },
          })
        }
      }

      return { applied: true }
    })
  }

  async getTodayRevenue(): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result = await this.prisma.client.order.aggregate({
      where: { status: 'PAID', createdAt: { gte: today } },
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
}
