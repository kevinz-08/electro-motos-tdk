import { Injectable } from '@nestjs/common'
import type { ITechnicalReviewerRepository, SaveTechnicalReviewerRecord, TechnicalReviewer } from '@h2r/domain'
import { PrismaService } from '../database/prisma.service'

type ReviewerRow = {
  id: string; name: string; slug: string; headline: string | null; yearsExperience: number | null
  bio: string; credentials: string[]; photoUrl: string | null; photoPublicId: string | null
  isActive: boolean; createdAt: Date
}

function toDomain(r: ReviewerRow): TechnicalReviewer {
  return {
    id: r.id, name: r.name, slug: r.slug, headline: r.headline, yearsExperience: r.yearsExperience,
    bio: r.bio, credentials: r.credentials, photoUrl: r.photoUrl, photoPublicId: r.photoPublicId,
    isActive: r.isActive, createdAt: r.createdAt,
  }
}

/** Revisores técnicos (docs/seo/, Fase 5 — H-21). */
@Injectable()
export class PrismaTechnicalReviewerRepository implements ITechnicalReviewerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: SaveTechnicalReviewerRecord): Promise<TechnicalReviewer> {
    const { id, ...data } = input
    const row = id
      ? await this.prisma.client.technicalReviewer.update({ where: { id }, data })
      : await this.prisma.client.technicalReviewer.create({ data })
    return toDomain(row)
  }

  async findById(id: string): Promise<TechnicalReviewer | null> {
    const row = await this.prisma.client.technicalReviewer.findUnique({ where: { id } })
    return row ? toDomain(row) : null
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const row = await this.prisma.client.technicalReviewer.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
    return row !== null
  }

  countGuides(reviewerId: string): Promise<number> {
    return this.prisma.client.maintenanceGuide.count({ where: { reviewerId } })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.technicalReviewer.delete({ where: { id } })
  }
}
