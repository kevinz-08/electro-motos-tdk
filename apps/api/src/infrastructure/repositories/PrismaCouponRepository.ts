import { Injectable } from '@nestjs/common'
import {
  ICouponRepository,
  CreateCouponInput,
  UpdateCouponInput,
  Coupon,
  CouponType,
  CouponRestriction,
  CouponScope,
  CustomerIdentity,
} from '@h2r/domain'
import { PrismaService } from '../database/prisma.service'

type PrismaCouponRow = {
  id: string
  code: string
  type: string
  value: number
  restriction: string
  scope: string
  allowGuest: boolean
  isActive: boolean
  expiresAt: Date
  createdAt: Date
  productId: string | null
  categories: { categoryId: string }[]
}

function toDomain(c: PrismaCouponRow): Coupon {
  return {
    id: c.id,
    code: c.code,
    type: c.type as CouponType,
    value: c.value,
    restriction: c.restriction as CouponRestriction,
    scope: c.scope as CouponScope,
    allowGuest: c.allowGuest,
    isActive: c.isActive,
    expiresAt: c.expiresAt,
    createdAt: c.createdAt,
    categoryIds: c.categories.map(cc => cc.categoryId),
    productId: c.productId,
  }
}

const COUPON_INCLUDE = { categories: { select: { categoryId: true } } } as const

@Injectable()
export class PrismaCouponRepository implements ICouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string): Promise<Coupon | null> {
    const c = await this.prisma.client.coupon.findUnique({
      where: { code },
      include: COUPON_INCLUDE,
    })
    return c ? toDomain(c) : null
  }

  async findAll(): Promise<Coupon[]> {
    const coupons = await this.prisma.client.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: COUPON_INCLUDE,
    })
    return coupons.map(toDomain)
  }

  async findById(id: string): Promise<Coupon | null> {
    const c = await this.prisma.client.coupon.findUnique({ where: { id }, include: COUPON_INCLUDE })
    return c ? toDomain(c) : null
  }

  async hasActiveRedemption(couponId: string, customer: CustomerIdentity): Promise<boolean> {
    const or: Array<{ userId: string } | { buyerIdKey: string }> = []
    if (customer.userId) or.push({ userId: customer.userId })
    if (customer.buyerIdKey) or.push({ buyerIdKey: customer.buyerIdKey })
    if (or.length === 0) return false
    const row = await this.prisma.client.couponRedemption.findFirst({
      where: { couponId, OR: or, status: { in: ['RESERVED', 'CONFIRMED'] } },
      select: { id: true },
    })
    return row !== null
  }

  async create(data: CreateCouponInput): Promise<Coupon> {
    const c = await this.prisma.client.coupon.create({
      data: {
        code: data.code,
        type: data.type,
        value: data.value,
        restriction: data.restriction,
        scope: data.scope,
        allowGuest: data.allowGuest ?? false,
        expiresAt: data.expiresAt,
        productId: data.productId ?? null,
        categories: data.categoryIds?.length
          ? { create: data.categoryIds.map(categoryId => ({ categoryId })) }
          : undefined,
      },
      include: COUPON_INCLUDE,
    })
    return toDomain(c)
  }

  async update(id: string, data: UpdateCouponInput): Promise<Coupon> {
    const c = await this.prisma.client.coupon.update({
      where: { id },
      data: {
        ...(data.code        !== undefined && { code:        data.code }),
        ...(data.type        !== undefined && { type:        data.type }),
        ...(data.value       !== undefined && { value:       data.value }),
        ...(data.restriction !== undefined && { restriction: data.restriction }),
        ...(data.scope       !== undefined && { scope:       data.scope }),
        ...(data.allowGuest  !== undefined && { allowGuest:  data.allowGuest }),
        ...(data.expiresAt   !== undefined && { expiresAt:   data.expiresAt }),
        ...(data.isActive    !== undefined && { isActive:    data.isActive }),
        ...('productId' in data && { productId: data.productId ?? null }),
        ...('categoryIds' in data && data.categoryIds !== undefined && {
          categories: {
            deleteMany: {},
            ...(data.categoryIds && data.categoryIds.length > 0 && {
              create: data.categoryIds.map(categoryId => ({ categoryId })),
            }),
          },
        }),
      },
      include: COUPON_INCLUDE,
    })
    return toDomain(c)
  }

  /** Soft delete: pone isActive = false preservando el historial de órdenes. */
  async delete(id: string): Promise<void> {
    await this.prisma.client.coupon.update({
      where: { id },
      data: { isActive: false },
    })
  }
}
