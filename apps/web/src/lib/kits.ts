/**
 * Lectura pública de los kits (docs/seo/plan-kits.md, Fase 4 ítem 8).
 *
 * Solo SSR: lee Prisma directo, como el resto de las lecturas de la tienda.
 * Precio y disponibilidad se calculan aquí con las mismas funciones puras del
 * dominio que usa el panel admin — nunca dos fórmulas para el mismo número.
 *
 * Un kit solo se considera visible si `computeKitAvailability(...) > 0` y está
 * activo y no borrado (`isKitVisible`). Todo lo que devuelven estas funciones
 * ya viene filtrado: quien las llama no vuelve a decidir visibilidad.
 */
import { prisma } from '@/infrastructure/database/prisma-client'
import {
  computeKitAvailability,
  computeKitPrice,
  isKitVisible,
  type KitModelRef,
} from '@h2r/domain'

const KIT_ITEM_SELECT = {
  quantity: true,
  order: true,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      price: true,
      stock: true,
      isActive: true,
      deletedAt: true,
      images: true,
      fitments: {
        where: { verified: true },
        select: {
          yearFrom: true,
          yearTo: true,
          model: { select: { slug: true, brand: { select: { slug: true } } } },
        },
      },
    },
  },
} as const

/** Un producto dentro de un kit, ya listo para pintar y para agregar al carrito. */
export interface KitItemSummary {
  productId: string
  name: string
  slug: string
  sku: string
  price: number
  stock: number
  quantity: number
  image: string | null
  models: KitModelRef[]
}

export interface KitSummary {
  id: string
  name: string
  slug: string
  description: string | null
  modelId: string | null
  itemsTotal: number
  discountCents: number
  price: number
  availableUnits: number
  items: KitItemSummary[]
}

function toSummary(kit: {
  id: string; name: string; slug: string; description: string | null; discountCents: number
  modelId: string | null; isActive: boolean; deletedAt: Date | null
  items: Array<{
    quantity: number
    product: {
      id: string; name: string; slug: string; sku: string; price: number; stock: number
      isActive: boolean; deletedAt: Date | null; images: string[]
      fitments: Array<{ yearFrom: number | null; yearTo: number | null; model: { slug: string; brand: { slug: string } } }>
    }
  }>
}): KitSummary | null {
  const itemsTotal = kit.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  const availableUnits = computeKitAvailability(kit.items.map((i) => ({ quantity: i.quantity, ...i.product })))
  if (!isKitVisible(kit, availableUnits)) return null

  return {
    id: kit.id,
    name: kit.name,
    slug: kit.slug,
    description: kit.description,
    modelId: kit.modelId,
    itemsTotal,
    discountCents: kit.discountCents,
    price: computeKitPrice(itemsTotal, kit.discountCents),
    availableUnits,
    items: kit.items.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      slug: i.product.slug,
      sku: i.product.sku,
      price: i.product.price,
      stock: i.product.stock,
      quantity: i.quantity,
      image: i.product.images[0] ?? null,
      models: i.product.fitments.map((f) => ({
        brandSlug: f.model.brand.slug,
        modelSlug: f.model.slug,
        yearFrom: f.yearFrom,
        yearTo: f.yearTo,
      })),
    })),
  }
}

/** Kits visibles asociados a un modelo de moto, para su hub. */
export async function findKitsByModel(modelId: string): Promise<KitSummary[]> {
  const kits = await prisma.kit.findMany({
    where: { modelId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { items: { orderBy: { order: 'asc' }, select: KIT_ITEM_SELECT } },
  })
  return kits.flatMap((k) => {
    const s = toSummary(k)
    return s ? [s] : []
  })
}

/** Un kit por su slug, para `/kits/[slug]`. `null` si no existe o no está visible. */
export async function findKitBySlug(slug: string): Promise<KitSummary | null> {
  const kit = await prisma.kit.findUnique({
    where: { slug },
    include: { items: { orderBy: { order: 'asc' }, select: KIT_ITEM_SELECT } },
  })
  return kit ? toSummary(kit) : null
}

/** Todos los kits visibles, para `/kits` y `sitemap-kits.xml`. */
export async function findAllVisibleKits(): Promise<KitSummary[]> {
  const kits = await prisma.kit.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { items: { orderBy: { order: 'asc' }, select: KIT_ITEM_SELECT } },
  })
  return kits.flatMap((k) => {
    const s = toSummary(k)
    return s ? [s] : []
  })
}

/** Nombre y slug de los kits visibles que incluyen este producto — mención en la ficha. */
export async function findKitsContainingProduct(productId: string): Promise<Array<{ name: string; slug: string }>> {
  const kits = await prisma.kit.findMany({
    where: { deletedAt: null, isActive: true, items: { some: { productId } } },
    include: { items: { orderBy: { order: 'asc' }, select: KIT_ITEM_SELECT } },
  })
  return kits.flatMap((k) => {
    const s = toSummary(k)
    return s ? [{ name: s.name, slug: s.slug }] : []
  })
}
