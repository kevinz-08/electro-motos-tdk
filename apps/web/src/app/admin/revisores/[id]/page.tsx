/**
 * `/admin/revisores/[id]` — crear (`id === 'nuevo'`) o editar un revisor técnico.
 */
import { notFound } from 'next/navigation'
import { prisma } from '@/infrastructure/database/prisma-client'
import { ReviewerEditForm, type ReviewerFormData } from '@/components/admin/ReviewerEditForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditReviewerPage({ params }: PageProps) {
  const { id } = await params
  const isNew = id === 'nuevo'

  const row = isNew
    ? null
    : await prisma.technicalReviewer.findUnique({ where: { id }, include: { _count: { select: { guides: true } } } })
  if (!isNew && !row) notFound()

  const reviewer: ReviewerFormData | undefined = row
    ? {
        id: row.id,
        name: row.name,
        slug: row.slug,
        headline: row.headline,
        yearsExperience: row.yearsExperience,
        bio: row.bio,
        credentials: row.credentials,
        photoUrl: row.photoUrl,
        photoPublicId: row.photoPublicId,
        isActive: row.isActive,
        guideCount: row._count.guides,
      }
    : undefined

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25">Contenido</p>
        <h1 className="text-2xl font-bold tracking-tight text-white">{reviewer ? reviewer.name : 'Nuevo revisor'}</h1>
      </div>
      <ReviewerEditForm reviewer={reviewer} />
    </div>
  )
}
