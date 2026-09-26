import type { Article, ArticleKind, ArticleStatus } from '@/domain/entities/Article'

export interface SaveArticleRecord {
  id?: string
  slug: string
  title: string
  kind: ArticleKind
  directAnswer: string
  body: string
  metaDescription: string | null
  sources: string[]
  authorName: string
  reviewerId: string | null
  reviewedAt: Date | null
  modelId: string | null
  status: ArticleStatus
  publishedAt: Date | null
}

/**
 * Contrato de acceso a datos de los artículos (docs/seo/, Fase 5 — ítem 1).
 * Implementado por PrismaArticleRepository en apps/api.
 */
export interface IArticleRepository {
  save(input: SaveArticleRecord): Promise<Article>
  findById(id: string): Promise<Article | null>
  /** true si el slug ya lo usa otro artículo (excluye `excludeId` al editar). */
  slugExists(slug: string, excludeId?: string): Promise<boolean>
  /** true si el modelo de moto existe (activo o no). */
  modelExists(modelId: string): Promise<boolean>
  delete(id: string): Promise<void>
}
