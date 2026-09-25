/**
 * `/admin/kits/[id]` — crear (`id === 'nuevo'`) o editar un kit.
 */
import { notFound } from 'next/navigation'
import { prisma } from '@/infrastructure/database/prisma-client'
import { KitEditForm, type KitItemDraft, type KitModelOption } from '@/components/admin/KitEditForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditKitPage({ params }: PageProps) {
  const { id } = await params
  const isNew = id === 'nuevo'

  const [kitRow, models] = await Promise.all([
    isNew
      ? null
      : prisma.kit.findUnique({
          where: { id },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: { product: { select: { id: true, name: true, sku: true, price: true, stock: true, isActive: true, images: true } } },
            },
          },
        }),
    prisma.motorcycleModel.findMany({
      where: { isActive: true },
      orderBy: [{ brand: { order: 'asc' } }, { name: 'asc' }],
      select: { id: true, name: true, brand: { select: { slug: true, name: true } } },
    }),
  ])

  if (!isNew && (!kitRow || kitRow.deletedAt)) notFound()

  const modelOptions: KitModelOption[] = models.map((m) => ({
    id: m.id, name: m.name, brandSlug: m.brand.slug, brandName: m.brand.name,
  }))

  const kit = kitRow
    ? {
        id: kitRow.id,
        name: kitRow.name,
        slug: kitRow.slug,
        description: kitRow.description,
        discountCents: kitRow.discountCents,
        modelId: kitRow.modelId,
        isActive: kitRow.isActive,
        items: kitRow.items.map(
          (i): KitItemDraft => ({
            productId: i.product.id,
            name: i.product.name,
            sku: i.product.sku,
            price: i.product.price,
            stock: i.product.stock,
            isActive: i.product.isActive,
            image: i.product.images[0] ?? null,
            quantity: i.quantity,
          }),
        ),
      }
    : undefined

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-white/25 uppercase mb-1">Catálogo</p>
        <h1 className="text-2xl font-bold text-white tracking-tight">{isNew ? 'Nuevo kit' : kit!.name}</h1>
      </div>
      <KitEditForm kit={kit} modelOptions={modelOptions} />
    </div>
  )
}
