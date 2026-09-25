import { Injectable } from '@nestjs/common'
import type { IKitRepository, Kit, SaveKitInput } from '@h2r/domain'
import { PrismaService } from '../database/prisma.service'

type PrismaKitRow = {
  id: string; name: string; slug: string; description: string | null
  discountCents: number; modelId: string | null; isActive: boolean
  createdAt: Date; deletedAt: Date | null
  items: Array<{ productId: string; quantity: number; order: number }>
}

function toDomain(k: PrismaKitRow): Kit {
  return {
    id: k.id,
    name: k.name,
    slug: k.slug,
    description: k.description,
    discountCents: k.discountCents,
    modelId: k.modelId,
    isActive: k.isActive,
    createdAt: k.createdAt,
    deletedAt: k.deletedAt,
    items: k.items,
  }
}

const ITEMS_INCLUDE = { items: { orderBy: { order: 'asc' as const } } }

/** Kits de productos (docs/seo/plan-kits.md). */
@Injectable()
export class PrismaKitRepository implements IKitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: SaveKitInput): Promise<Kit> {
    const data = {
      name: input.name,
      slug: input.slug,
      description: input.description,
      discountCents: input.discountCents,
      modelId: input.modelId,
      isActive: input.isActive,
    }

    const kit = input.id
      ? await this.prisma.client.$transaction(async (tx) => {
          await tx.kitItem.deleteMany({ where: { kitId: input.id } })
          return tx.kit.update({
            where: { id: input.id },
            data: { ...data, items: { createMany: { data: input.items } } },
            include: ITEMS_INCLUDE,
          })
        })
      : await this.prisma.client.kit.create({
          data: { ...data, items: { createMany: { data: input.items } } },
          include: ITEMS_INCLUDE,
        })

    return toDomain(kit)
  }

  async findById(id: string): Promise<Kit | null> {
    const kit = await this.prisma.client.kit.findUnique({ where: { id }, include: ITEMS_INCLUDE })
    return kit ? toDomain(kit) : null
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const kit = await this.prisma.client.kit.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
    return kit !== null
  }

  async findProducts(ids: readonly string[]): Promise<Array<{ id: string; price: number }>> {
    if (ids.length === 0) return []
    return this.prisma.client.product.findMany({
      where: { id: { in: [...ids] }, deletedAt: null },
      select: { id: true, price: true },
    })
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.client.kit.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
  }
}
