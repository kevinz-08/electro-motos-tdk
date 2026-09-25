import { Injectable } from '@nestjs/common'
import type { IMaintenanceGuideRepository, MaintenanceGuide, SaveMaintenanceGuideInput } from '@h2r/domain'
import { PrismaService } from '../database/prisma.service'

type GuideRow = {
  id: string; modelId: string; source: string; reviewerId: string; notes: string | null; reviewedAt: Date
  items: Array<{ label: string; intervalKm: number | null; intervalMonths: number | null; notes: string | null; productId: string | null; order: number }>
}

function toDomain(g: GuideRow): MaintenanceGuide {
  return {
    id: g.id, modelId: g.modelId, source: g.source, reviewerId: g.reviewerId, notes: g.notes,
    reviewedAt: g.reviewedAt, items: g.items,
  }
}

const ITEMS_INCLUDE = { items: { orderBy: { order: 'asc' as const } } }

/** Guías de mantenimiento por modelo (docs/seo/, Fase 5 — H-20). */
@Injectable()
export class PrismaMaintenanceGuideRepository implements IMaintenanceGuideRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByModelId(modelId: string): Promise<MaintenanceGuide | null> {
    const g = await this.prisma.client.maintenanceGuide.findUnique({ where: { modelId }, include: ITEMS_INCLUDE })
    return g ? toDomain(g) : null
  }

  /** Reemplaza la guía completa de un modelo (cabecera + puntos de control) en una sola transacción. */
  async save(input: SaveMaintenanceGuideInput): Promise<MaintenanceGuide> {
    const { modelId, items, ...header } = input
    const guide = await this.prisma.client.$transaction(async (tx) => {
      const existing = await tx.maintenanceGuide.findUnique({ where: { modelId }, select: { id: true } })
      if (existing) await tx.maintenanceItem.deleteMany({ where: { guideId: existing.id } })
      return tx.maintenanceGuide.upsert({
        where: { modelId },
        create: { modelId, ...header, items: { createMany: { data: items } } },
        update: { ...header, items: { createMany: { data: items } } },
        include: ITEMS_INCLUDE,
      })
    })
    return toDomain(guide)
  }

  async deleteByModelId(modelId: string): Promise<void> {
    await this.prisma.client.maintenanceGuide.deleteMany({ where: { modelId } })
  }

  async modelExists(modelId: string): Promise<boolean> {
    const m = await this.prisma.client.motorcycleModel.findFirst({ where: { id: modelId, isActive: true }, select: { id: true } })
    return m !== null
  }

  findReviewer(reviewerId: string): Promise<{ id: string; isActive: boolean } | null> {
    return this.prisma.client.technicalReviewer.findUnique({ where: { id: reviewerId }, select: { id: true, isActive: true } })
  }

  async findExistingProductIds(ids: readonly string[]): Promise<string[]> {
    if (ids.length === 0) return []
    const rows = await this.prisma.client.product.findMany({ where: { id: { in: [...ids] }, deletedAt: null }, select: { id: true } })
    return rows.map((r) => r.id)
  }
}
