/**
 * Lectura pública de artículos (docs/seo/, Fase 5 — ítem 1).
 *
 * Solo SSR, sobre Prisma, como `lib/guides.ts`. Todo lo que devuelve ya pasó la
 * regla de publicación del dominio (`isArticlePublishable`): estado PUBLISHED,
 * contenido completo y un revisor técnico ACTIVO. Si el revisor se desactiva,
 * sus artículos desaparecen de aquí, de `/guias` y del sitemap sin tocar nada más.
 */
import { prisma } from '@/infrastructure/database/prisma-client'
import { isArticlePublishable, type ArticleKind } from '@h2r/domain'
import type { PublicReviewer } from './guides'

export interface PublicArticle {
  slug: string
  title: string
  kind: ArticleKind
  directAnswer: string
  body: string
  metaDescription: string | null
  sources: string[]
  authorName: string
  /** ISO. */
  reviewedAt: string
  /** ISO. */
  publishedAt: string
  /** ISO — "última actualización" visible y `dateModified` del JSON-LD. */
  updatedAt: string
  reviewer: PublicReviewer
  /** Modelo del que trata, para enlazar su hub (y su guía de mantenimiento si existe). */
  model: { name: string; slug: string; brandName: string; brandSlug: string } | null
}

export interface PublicArticleSummary {
  slug: string
  title: string
  kind: ArticleKind
  directAnswer: string
  /** ISO. */
  updatedAt: string
}

const REVIEWER_SELECT = {
  id: true, name: true, slug: true, headline: true, yearsExperience: true, bio: true, credentials: true,
  photoUrl: true, isActive: true,
} as const

/** Filtro de base de datos que coincide con la regla del dominio (luego se confirma con ella). */
const PUBLISHED_WHERE = { status: 'PUBLISHED' as const, reviewer: { isActive: true }, reviewedAt: { not: null } }

/** Un artículo publicado por su slug, o `null`. */
export async function findPublishedArticle(slug: string): Promise<PublicArticle | null> {
  const row = await prisma.article.findFirst({
    where: { slug, ...PUBLISHED_WHERE },
    include: {
      reviewer: { select: REVIEWER_SELECT },
      model: { select: { name: true, slug: true, isActive: true, brand: { select: { name: true, slug: true } } } },
    },
  })
  if (!row || !row.reviewer || !row.reviewedAt || !isArticlePublishable(row, row.reviewer)) return null

  const r = row.reviewer
  const reviewer: PublicReviewer = {
    id: r.id, name: r.name, slug: r.slug, headline: r.headline, yearsExperience: r.yearsExperience,
    bio: r.bio, credentials: r.credentials, photoUrl: r.photoUrl,
  }
  return {
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    directAnswer: row.directAnswer,
    body: row.body,
    metaDescription: row.metaDescription,
    sources: row.sources,
    authorName: row.authorName,
    reviewedAt: row.reviewedAt.toISOString(),
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    reviewer,
    model:
      row.model && row.model.isActive
        ? { name: row.model.name, slug: row.model.slug, brandName: row.model.brand.name, brandSlug: row.model.brand.slug }
        : null,
  }
}

/** Artículos publicados, del más reciente al más antiguo (índice `/guias` y sitemap). */
export async function findPublishedArticles(): Promise<PublicArticleSummary[]> {
  const rows = await prisma.article.findMany({
    where: PUBLISHED_WHERE,
    orderBy: { updatedAt: 'desc' },
    select: {
      slug: true, title: true, kind: true, directAnswer: true, body: true, sources: true, status: true,
      reviewerId: true, reviewedAt: true, updatedAt: true, reviewer: { select: { isActive: true } },
    },
  })
  return rows
    .filter((r) => isArticlePublishable(r, r.reviewer))
    .map((r) => ({ slug: r.slug, title: r.title, kind: r.kind, directAnswer: r.directAnswer, updatedAt: r.updatedAt.toISOString() }))
}

/** Artículos publicados que firma un revisor (para su página de autor). */
export async function findPublishedArticlesByReviewer(reviewerId: string): Promise<Array<{ label: string; href: string }>> {
  const rows = await prisma.article.findMany({
    where: { ...PUBLISHED_WHERE, reviewerId },
    orderBy: { updatedAt: 'desc' },
    select: { slug: true, title: true },
  })
  return rows.map((r) => ({ label: r.title, href: `/guias/${r.slug}` }))
}
