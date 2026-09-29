/**
 * `/admin/guias/[id]` — crear (`id === 'nuevo'`) o editar un artículo
 * (docs/seo/, Fase 5 — ítem 1).
 */
import { notFound } from 'next/navigation'
import { prisma } from '@/infrastructure/database/prisma-client'
import { ArticleEditForm, type ArticleFormData } from '@/components/admin/ArticleEditForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditArticlePage({ params }: PageProps) {
  const { id } = await params
  const isNew = id === 'nuevo'

  const [row, reviewers, models] = await Promise.all([
    isNew ? null : prisma.article.findUnique({ where: { id } }),
    prisma.technicalReviewer.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, isActive: true } }),
    prisma.motorcycleModel.findMany({
      where: { isActive: true },
      orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
      select: { id: true, name: true, brand: { select: { name: true } } },
    }),
  ])
  if (!isNew && !row) notFound()

  const article: ArticleFormData | undefined = row
    ? {
        id: row.id,
        slug: row.slug,
        title: row.title,
        kind: row.kind,
        directAnswer: row.directAnswer,
        body: row.body,
        metaDescription: row.metaDescription,
        sources: row.sources,
        authorName: row.authorName,
        reviewerId: row.reviewerId,
        reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString().slice(0, 10) : null,
        modelId: row.modelId,
        status: row.status,
      }
    : undefined

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25">Contenido</p>
        <h1 className="text-2xl font-bold tracking-tight text-white">{article ? article.title : 'Nuevo artículo'}</h1>
      </div>
      <ArticleEditForm
        article={article}
        reviewers={reviewers}
        models={models.map((m) => ({ id: m.id, label: `${m.brand.name} ${m.name}` }))}
      />
    </div>
  )
}
