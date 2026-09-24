import { Injectable } from '@nestjs/common'
import type { AppendCrossSellOutcome, CrossSellLink, ICrossSellRepository } from '@h2r/domain'
import { PrismaService } from '../database/prisma.service'

/** Venta cruzada (docs/seo/plan-venta-cruzada.md). Solo escritura y lectura de vínculos. */
@Injectable()
export class PrismaCrossSellRepository implements ICrossSellRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(productId: string): Promise<CrossSellLink[]> {
    const rows = await this.prisma.client.productCrossSell.findMany({
      where: { productId },
      orderBy: { order: 'asc' },
    })
    return rows.map((r) => ({ productId: r.productId, relatedId: r.relatedId, reason: r.reason, order: r.order }))
  }

  async replaceForProduct(
    productId: string,
    links: ReadonlyArray<Pick<CrossSellLink, 'relatedId' | 'reason' | 'order'>>,
  ): Promise<void> {
    await this.prisma.client.$transaction([
      this.prisma.client.productCrossSell.deleteMany({ where: { productId } }),
      ...(links.length > 0
        ? [
            this.prisma.client.productCrossSell.createMany({
              data: links.map((l) => ({ productId, relatedId: l.relatedId, reason: l.reason, order: l.order })),
            }),
          ]
        : []),
    ])
  }

  async appendIfRoom(productId: string, relatedId: string, max: number): Promise<AppendCrossSellOutcome> {
    return this.prisma.client.$transaction(async (tx) => {
      const current = await tx.productCrossSell.findMany({ where: { productId }, select: { relatedId: true } })
      if (current.some((c) => c.relatedId === relatedId)) return 'exists'
      if (current.length >= max) return 'full'
      await tx.productCrossSell.create({ data: { productId, relatedId, reason: null, order: current.length } })
      return 'added'
    })
  }

  async findExistingProductIds(ids: readonly string[]): Promise<string[]> {
    if (ids.length === 0) return []
    const rows = await this.prisma.client.product.findMany({
      where: { id: { in: [...ids] }, deletedAt: null },
      select: { id: true },
    })
    return rows.map((r) => r.id)
  }
}
