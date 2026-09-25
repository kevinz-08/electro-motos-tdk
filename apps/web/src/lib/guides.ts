/**
 * Lectura pública de revisores técnicos y guías de mantenimiento
 * (docs/seo/, Fase 5 — H-20 y H-21).
 *
 * Solo SSR: lee Prisma directo, como el resto de las lecturas de la tienda.
 * Todo lo que devuelven estas funciones ya viene filtrado por las reglas de
 * publicación — quien las llama no vuelve a decidir qué se muestra:
 *
 *   - Una guía solo existe públicamente si tiene al menos un punto de control Y
 *     su revisor está activo (`isMaintenanceGuidePublishable`). Sin guía
 *     guardada devuelven `null`/`[]`: la ruta responde 404 y el hub no enseña
 *     ningún enlace. No hay página genérica ni texto de relleno.
 *   - Un revisor desactivado no tiene página pública y sus guías se ocultan.
 *   - El precio y el stock de los repuestos enlazados se leen en vivo del
 *     producto; un repuesto inactivo o borrado simplemente no se enlaza.
 */
import { prisma } from '@/infrastructure/database/prisma-client'
import { isMaintenanceGuidePublishable, type MaintenanceItem } from '@h2r/domain'

export interface PublicReviewer {
  id: string
  name: string
  slug: string
  headline: string | null
  yearsExperience: number | null
  bio: string
  credentials: string[]
  photoUrl: string | null
}

export interface PublicGuideProduct {
  name: string
  slug: string
  price: number
  stock: number
  image: string | null
}

export interface PublicGuideItem extends Pick<MaintenanceItem, 'label' | 'intervalKm' | 'intervalMonths' | 'notes'> {
  /** Repuesto exacto de H2R, solo si existe y está activo. */
  product: PublicGuideProduct | null
}

export interface PublicMaintenanceGuide {
  model: { name: string; slug: string; brandName: string; brandSlug: string; cc: number | null }
  source: string
  notes: string | null
  /** ISO — la fecha visible "revisado el…" y el `dateModified` del JSON-LD. */
  reviewedAt: string
  reviewer: PublicReviewer
  items: PublicGuideItem[]
}

const REVIEWER_SELECT = {
  id: true,
  name: true,
  slug: true,
  headline: true,
  yearsExperience: true,
  bio: true,
  credentials: true,
  photoUrl: true,
  isActive: true,
} as const

function toPublicReviewer(r: PublicReviewer & { isActive: boolean }): PublicReviewer {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    headline: r.headline,
    yearsExperience: r.yearsExperience,
    bio: r.bio,
    credentials: r.credentials,
    photoUrl: r.photoUrl,
  }
}

/** La guía de un modelo por sus slugs, o `null` si no existe o no se puede publicar. */
export async function findMaintenanceGuide(brandSlug: string, modelSlug: string): Promise<PublicMaintenanceGuide | null> {
  const guide = await prisma.maintenanceGuide.findFirst({
    where: { model: { slug: modelSlug, isActive: true, brand: { slug: brandSlug, isActive: true } } },
    include: {
      model: { select: { name: true, slug: true, cc: true, brand: { select: { name: true, slug: true } } } },
      reviewer: { select: REVIEWER_SELECT },
      items: {
        orderBy: { order: 'asc' },
        include: { product: { select: { name: true, slug: true, price: true, stock: true, images: true, isActive: true, deletedAt: true } } },
      },
    },
  })
  if (!guide || !isMaintenanceGuidePublishable(guide, guide.reviewer)) return null

  return {
    model: { name: guide.model.name, slug: guide.model.slug, cc: guide.model.cc, brandName: guide.model.brand.name, brandSlug: guide.model.brand.slug },
    source: guide.source,
    notes: guide.notes,
    reviewedAt: guide.reviewedAt.toISOString(),
    reviewer: toPublicReviewer(guide.reviewer),
    items: guide.items.map((i) => ({
      label: i.label,
      intervalKm: i.intervalKm,
      intervalMonths: i.intervalMonths,
      notes: i.notes,
      product:
        i.product && i.product.isActive && !i.product.deletedAt
          ? { name: i.product.name, slug: i.product.slug, price: i.product.price, stock: i.product.stock, image: i.product.images[0] ?? null }
          : null,
    })),
  }
}

/** Un revisor ACTIVO por su slug, con las guías publicadas que firma. `null` si no existe o está desactivado. */
export async function findReviewerBySlug(slug: string): Promise<(PublicReviewer & { guides: Array<{ label: string; href: string }> }) | null> {
  const reviewer = await prisma.technicalReviewer.findFirst({
    where: { slug, isActive: true },
    select: {
      ...REVIEWER_SELECT,
      guides: {
        where: { items: { some: {} }, model: { isActive: true } },
        select: { model: { select: { name: true, slug: true, brand: { select: { name: true, slug: true } } } } },
        orderBy: { reviewedAt: 'desc' },
      },
    },
  })
  if (!reviewer) return null

  const { guides, ...profile } = reviewer
  return {
    ...toPublicReviewer(profile),
    guides: guides.map((g) => ({
      label: `${g.model.brand.name} ${g.model.name}`,
      href: `/guias/mantenimiento/${g.model.brand.slug}/${g.model.slug}`,
    })),
  }
}

/** Guías publicadas y revisores activos con guías, para el sitemap. */
export async function findPublishedGuideEntries(): Promise<{
  guides: Array<{ brandSlug: string; modelSlug: string; reviewedAt: Date }>
  reviewers: Array<{ slug: string }>
}> {
  const guides = await prisma.maintenanceGuide.findMany({
    where: { items: { some: {} }, reviewer: { isActive: true }, model: { isActive: true, brand: { isActive: true } } },
    select: { reviewedAt: true, model: { select: { slug: true, brand: { select: { slug: true } } } } },
    orderBy: { reviewedAt: 'desc' },
  })
  const reviewers = await prisma.technicalReviewer.findMany({
    where: { isActive: true, guides: { some: { items: { some: {} }, model: { isActive: true } } } },
    select: { slug: true },
  })
  return {
    guides: guides.map((g) => ({ brandSlug: g.model.brand.slug, modelSlug: g.model.slug, reviewedAt: g.reviewedAt })),
    reviewers,
  }
}

/** ¿El modelo tiene una guía publicable? Solo para enlazarla desde su hub. */
export async function hasPublishedGuide(modelId: string): Promise<boolean> {
  const guide = await prisma.maintenanceGuide.findUnique({
    where: { modelId },
    select: { reviewer: { select: { isActive: true } }, _count: { select: { items: true } } },
  })
  return guide !== null && guide._count.items > 0 && guide.reviewer.isActive
}
