import type { TechnicalReviewer } from './TechnicalReviewer'

/**
 * Artículo de contenido (docs/seo/, Fase 5 — ítem 1 del ROADMAP).
 *
 * Cubre lo que no es una guía de mantenimiento por modelo: comparativas, la guía
 * de revisión técnico-mecánica y cualquier guía futura. Vive en la base de datos
 * y se edita desde `/admin/guias`, igual que revisores y guías: el negocio puede
 * corregir un texto sin desplegar.
 *
 * Estados: DRAFT (borrador) → IN_REVIEW (listo para que el revisor lo lea) →
 * PUBLISHED. La regla que manda, heredada del ROADMAP: **nada se publica sin la
 * revisión de alguien con conocimiento mecánico**. Por eso publicar exige un
 * revisor técnico ACTIVO y la fecha de su revisión, y si el revisor se desactiva
 * el artículo deja de mostrarse solo.
 */

export type ArticleStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED'
export type ArticleKind = 'GUIA' | 'COMPARATIVA'

export const ARTICLE_STATUSES: readonly ArticleStatus[] = ['DRAFT', 'IN_REVIEW', 'PUBLISHED']
export const ARTICLE_KINDS: readonly ArticleKind[] = ['GUIA', 'COMPARATIVA']

export const ARTICLE_TITLE_MAX_LENGTH = 120
export const ARTICLE_SLUG_MAX_LENGTH = 100
export const ARTICLE_META_DESCRIPTION_MAX_LENGTH = 160
export const ARTICLE_BODY_MAX_LENGTH = 60_000
export const ARTICLE_AUTHOR_MAX_LENGTH = 80
export const ARTICLE_MAX_SOURCES = 10
export const ARTICLE_SOURCE_MAX_LENGTH = 300
/** Respuesta directa de apertura: el formato que citan buscadores e IAs (ROADMAP, Fase 5). */
export const DIRECT_ANSWER_MIN_WORDS = 40
export const DIRECT_ANSWER_MAX_WORDS = 60
export const DIRECT_ANSWER_MAX_LENGTH = 600

/**
 * Slugs que no puede usar un artículo porque chocan con rutas existentes bajo
 * `/guias/` (las guías de mantenimiento viven en `/guias/mantenimiento/...`).
 */
export const RESERVED_ARTICLE_SLUGS: readonly string[] = ['mantenimiento']

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export interface Article {
  id: string
  slug: string
  title: string
  kind: ArticleKind
  directAnswer: string
  /** Markdown restringido — ver `parseArticleBody`. */
  body: string
  metaDescription: string | null
  sources: string[]
  authorName: string
  reviewerId: string | null
  reviewedAt: Date | null
  /** Modelo de moto al que se refiere (opcional): enlaza su hub y su guía. */
  modelId: string | null
  status: ArticleStatus
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  DRAFT: 'Borrador',
  IN_REVIEW: 'En revisión',
  PUBLISHED: 'Publicado',
}

export const ARTICLE_KIND_LABELS: Record<ArticleKind, string> = {
  GUIA: 'Guía',
  COMPARATIVA: 'Comparativa',
}

/** Palabras de un texto (separadas por espacios). Un texto vacío tiene 0. */
export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

type ArticleFields = Pick<
  Article,
  'slug' | 'title' | 'kind' | 'directAnswer' | 'body' | 'metaDescription' | 'sources' | 'authorName'
>

/**
 * Validación que aplica a TODO guardado, también a un borrador: lo mínimo para
 * que exista una fila coherente. Devuelve el motivo o `null`.
 */
export function validateArticleDraft(input: ArticleFields): string | null {
  const title = input.title.trim()
  if (!title) return 'El título es obligatorio'
  if (title.length > ARTICLE_TITLE_MAX_LENGTH) return `El título admite máximo ${ARTICLE_TITLE_MAX_LENGTH} caracteres`

  const slug = input.slug.trim()
  if (!slug) return 'El slug es obligatorio'
  if (slug.length > ARTICLE_SLUG_MAX_LENGTH || !SLUG_PATTERN.test(slug)) {
    return 'El slug solo admite minúsculas, números y guiones (máx. 100 caracteres)'
  }
  if (RESERVED_ARTICLE_SLUGS.includes(slug)) return `El slug "${slug}" está reservado`

  if (!ARTICLE_KINDS.includes(input.kind)) return 'Tipo de artículo no válido'
  if (input.directAnswer.length > DIRECT_ANSWER_MAX_LENGTH) {
    return `La respuesta directa admite máximo ${DIRECT_ANSWER_MAX_LENGTH} caracteres`
  }
  if (input.body.length > ARTICLE_BODY_MAX_LENGTH) return `El cuerpo admite máximo ${ARTICLE_BODY_MAX_LENGTH} caracteres`
  if ((input.metaDescription?.length ?? 0) > ARTICLE_META_DESCRIPTION_MAX_LENGTH) {
    return `La meta descripción admite máximo ${ARTICLE_META_DESCRIPTION_MAX_LENGTH} caracteres`
  }
  if (input.sources.length > ARTICLE_MAX_SOURCES) return `Máximo ${ARTICLE_MAX_SOURCES} fuentes`
  if (input.sources.some((s) => s.length > ARTICLE_SOURCE_MAX_LENGTH)) {
    return `Cada fuente admite máximo ${ARTICLE_SOURCE_MAX_LENGTH} caracteres`
  }
  if (!input.authorName.trim()) return 'Indica quién escribió el artículo'
  if (input.authorName.length > ARTICLE_AUTHOR_MAX_LENGTH) {
    return `El autor admite máximo ${ARTICLE_AUTHOR_MAX_LENGTH} caracteres`
  }
  return null
}

/**
 * Lo que impide que el artículo pase al estado pedido. Lista vacía = puede.
 *
 *   - DRAFT: nada (un borrador puede estar a medias).
 *   - IN_REVIEW: contenido completo — respuesta directa de 40 a 60 palabras,
 *     cuerpo y al menos una fuente. Es lo que el revisor necesita para leerlo.
 *   - PUBLISHED: lo anterior + revisor técnico activo + fecha de revisión.
 */
export function articlePublishBlockers(
  article: Pick<Article, 'directAnswer' | 'body' | 'sources' | 'reviewerId' | 'reviewedAt'>,
  target: ArticleStatus,
  reviewer: Pick<TechnicalReviewer, 'isActive'> | null,
): string[] {
  if (target === 'DRAFT') return []
  const blockers: string[] = []

  const words = countWords(article.directAnswer)
  if (words < DIRECT_ANSWER_MIN_WORDS || words > DIRECT_ANSWER_MAX_WORDS) {
    blockers.push(
      `La respuesta directa debe tener entre ${DIRECT_ANSWER_MIN_WORDS} y ${DIRECT_ANSWER_MAX_WORDS} palabras (tiene ${words})`,
    )
  }
  if (!article.body.trim()) blockers.push('El cuerpo del artículo está vacío')
  if (article.sources.filter((s) => s.trim()).length === 0) blockers.push('Cita al menos una fuente')

  if (target === 'PUBLISHED') {
    if (!article.reviewerId || !reviewer) blockers.push('Asigna un revisor técnico: sin revisión no se publica')
    else if (!reviewer.isActive) blockers.push('El revisor asignado está desactivado')
    if (!article.reviewedAt) blockers.push('Indica la fecha en que el revisor aprobó el texto')
  }
  return blockers
}

/** ¿Se muestra al público? Publicado, sin bloqueos y con el revisor activo. */
export function isArticlePublishable(
  article: Pick<Article, 'status' | 'directAnswer' | 'body' | 'sources' | 'reviewerId' | 'reviewedAt'>,
  reviewer: Pick<TechnicalReviewer, 'isActive'> | null,
): boolean {
  return article.status === 'PUBLISHED' && articlePublishBlockers(article, 'PUBLISHED', reviewer).length === 0
}
