import { Injectable } from '@nestjs/common'
import type { Article, IArticleRepository, SaveArticleRecord } from '@h2r/domain'
import { PrismaService } from '../database/prisma.service'

function toDomain(r: Article): Article {
  return {
    id: r.id, slug: r.slug, title: r.title, kind: r.kind, directAnswer: r.directAnswer, body: r.body,
    metaDescription: r.metaDescription, sources: r.sources, authorName: r.authorName, reviewerId: r.reviewerId,
    reviewedAt: r.reviewedAt, modelId: r.modelId, status: r.status, publishedAt: r.publishedAt,
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  }
}

/** Artículos de contenido (docs/seo/, Fase 5 — ítem 1). */
@Injectable()
export class PrismaArticleRepository implements IArticleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: SaveArticleRecord): Promise<Article> {
    const { id, ...data } = input
    const row = id
      ? await this.prisma.client.article.update({ where: { id }, data })
      : await this.prisma.client.article.create({ data })
    return toDomain(row)
  }

  async findById(id: string): Promise<Article | null> {
    const row = await this.prisma.client.article.findUnique({ where: { id } })
    return row ? toDomain(row) : null
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const row = await this.prisma.client.article.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    })
    return row !== null
  }

  async modelExists(modelId: string): Promise<boolean> {
    return (await this.prisma.client.motorcycleModel.count({ where: { id: modelId } })) > 0
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.article.delete({ where: { id } })
  }
}
