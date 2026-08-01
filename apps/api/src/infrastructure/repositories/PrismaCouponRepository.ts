import { Injectable } from '@nestjs/common'
import {
  ICouponRepository,
  CreateCouponInput,
  UpdateCouponInput,
  Coupon,
  CouponType,
  CouponRestriction,
  CouponScope,
} from '@h2r/domain'
import { PrismaService } from '../database/prisma.service'

type PrismaCouponRow = {
  id: string
  code: string
  type: string
  value: number
  restriction: string
  scope: string
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

  async create(data: CreateCouponInput): Promise<Coupon> {
    const c = await this.prisma.client.coupon.create({
      data: {
        code: data.code,
        type: data.type,
        value: data.value,
        restriction: data.restriction,
        scope: data.scope,
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
