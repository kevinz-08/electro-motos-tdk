/**
 * `/admin/mantenimiento/[modelId]` — crear o editar la guía de mantenimiento de un modelo.
 */
import { notFound } from 'next/navigation'
import { prisma } from '@/infrastructure/database/prisma-client'
import { MaintenanceGuideForm, type GuideInitial } from '@/components/admin/MaintenanceGuideForm'

interface PageProps {
  params: Promise<{ modelId: string }>
}

export default async function EditMaintenanceGuidePage({ params }: PageProps) {
  const { modelId } = await params

  const [model, reviewers, guide] = await Promise.all([
    prisma.motorcycleModel.findFirst({
      where: { id: modelId, isActive: true },
      select: { id: true, name: true, slug: true, brand: { select: { name: true, slug: true } } },
    }),
    prisma.technicalReviewer.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, isActive: true } }),
    prisma.maintenanceGuide.findUnique({
      where: { modelId },
      include: {
        items: {
          orderBy: { order: 'asc' },
          include: { product: { select: { id: true, name: true, sku: true, price: true, stock: true, isActive: true, images: true } } },
        },
      },
    }),
  ])
  if (!model) notFound()

  const modelLabel = `${model.brand.name} ${model.name}`
  const initial: GuideInitial | null = guide
    ? {
        source: guide.source,
        reviewerId: guide.reviewerId,
        notes: guide.notes,
        reviewedAt: guide.reviewedAt.toISOString().slice(0, 10),
        items: guide.items.map((i) => ({
          label: i.label,
          km: i.intervalKm === null ? '' : String(i.intervalKm),
          months: i.intervalMonths === null ? '' : String(i.intervalMonths),
          notes: i.notes ?? '',
          product: i.product
            ? { id: i.product.id, name: i.product.name, sku: i.product.sku, price: i.product.price, stock: i.product.stock, isActive: i.product.isActive, image: i.product.images[0] ?? null }
            : null,
        })),
      }
    : null

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25">Mantenimiento</p>
        <h1 className="text-2xl font-bold tracking-tight text-white">{modelLabel}</h1>
      </div>
      <MaintenanceGuideForm
        modelId={model.id}
        modelLabel={modelLabel}
        publicPath={`/guias/mantenimiento/${model.brand.slug}/${model.slug}`}
        reviewers={reviewers}
        initial={initial}
      />
    </div>
  )
}
