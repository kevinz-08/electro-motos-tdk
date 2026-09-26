import type { IArticleRepository } from '@/domain/repositories/IArticleRepository'
import type { ITechnicalReviewerRepository } from '@/domain/repositories/ITechnicalReviewerRepository'
import {
  articlePublishBlockers,
  validateArticleDraft,
  type Article,
  type ArticleKind,
  type ArticleStatus,
} from '@/domain/entities/Article'
import { Result, ok, err, AppError } from '@/domain/shared/Result'

export interface SaveArticleInput {
  /** Presente = editar; ausente = crear. */
  id?: string
  slug: string
  title: string
  kind: ArticleKind
  directAnswer?: string
  body?: string
  metaDescription?: string | null
  sources?: readonly string[]
  authorName: string
  reviewerId?: string | null
  reviewedAt?: Date | null
  modelId?: string | null
  status: ArticleStatus
}

/**
 * Use case: crear o actualizar un artículo (Fase 5, ítem 1).
 *
 * Reglas:
 *   1. Todo guardado pasa `validateArticleDraft` (título, slug, largos).
 *   2. Pasar a IN_REVIEW o PUBLISHED exige `articlePublishBlockers` vacío:
 *      publicar sin revisor técnico activo o sin fecha de revisión es imposible.
 *   3. `publishedAt` se fija la primera vez que se publica y no cambia al
 *      editar (es la fecha de publicación original); volver a borrador lo
 *      conserva para que una republicación no parezca contenido nuevo.
 *   4. Slug único; el revisor y el modelo, si se indican, tienen que existir.
 *
 * Nunca lanza: devuelve `Result`.
 */
export class SaveArticle {
  constructor(
    private readonly repo: IArticleRepository,
    private readonly reviewerRepo: ITechnicalReviewerRepository,
  ) {}

  async execute(input: SaveArticleInput): Promise<Result<Article>> {
    const fields = {
      slug: input.slug.trim(),
      title: input.title.trim(),
      kind: input.kind,
      directAnswer: (input.directAnswer ?? '').trim(),
      body: (input.body ?? '').trim(),
      metaDescription: input.metaDescription?.trim() || null,
      sources: (input.sources ?? []).map((s) => s.trim()).filter(Boolean),
      authorName: input.authorName.trim(),
    }
    const invalid = validateArticleDraft(fields)
    if (invalid) return err(new AppError('VALIDATION_ERROR', invalid))

    const reviewerId = input.reviewerId || null
    const reviewedAt = input.reviewedAt ?? null
    const modelId = input.modelId || null

    try {
      const previous = input.id ? await this.repo.findById(input.id) : null
      if (input.id && !previous) return err(new AppError('NOT_FOUND', 'Artículo no encontrado'))
      if (await this.repo.slugExists(fields.slug, input.id)) {
        return err(new AppError('VALIDATION_ERROR', 'Ya existe un artículo con ese slug'))
      }

      const reviewer = reviewerId ? await this.reviewerRepo.findById(reviewerId) : null
      if (reviewerId && !reviewer) return err(new AppError('NOT_FOUND', 'El revisor técnico no existe'))
      if (modelId && !(await this.repo.modelExists(modelId))) {
        return err(new AppError('NOT_FOUND', 'El modelo de moto no existe'))
      }

      const blockers = articlePublishBlockers({ ...fields, reviewerId, reviewedAt }, input.status, reviewer)
      if (blockers.length > 0) return err(new AppError('VALIDATION_ERROR', blockers.join('. ')))

      const article = await this.repo.save({
        id: input.id,
        ...fields,
        reviewerId,
        reviewedAt,
        modelId,
        status: input.status,
        publishedAt: previous?.publishedAt ?? (input.status === 'PUBLISHED' ? new Date() : null),
      })
      return ok(article)
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'No se pudo guardar el artículo', e))
    }
  }
}
