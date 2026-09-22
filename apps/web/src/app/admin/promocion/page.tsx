import type { Metadata } from 'next'
import { prisma } from '@/infrastructure/database/prisma-client'
import {
  PromoModalManager,
  type PromoModalRow,
  type CategoryOption,
  type ProductOption,
} from '@/components/admin/PromoModalManager'

export const metadata: Metadata = { title: 'Pop-up promocional' }

export default async function AdminPromoPage() {
  const [row, categoryRows, productRows] = await Promise.all([
    prisma.promoModal.findUnique({ where: { id: 'default' } }),
    prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, parentId: true },
    }),
    prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { name: true, slug: true, sku: true },
    }),
  ])

  const promo: PromoModalRow | null = row && {
    isActive: row.isActive,
    desktopImageUrl: row.desktopImageUrl,
    desktopImagePublicId: row.desktopImagePublicId,
    mobileImageUrl: row.mobileImageUrl,
    mobileImagePublicId: row.mobileImagePublicId,
    altText: row.altText,
    ctaUrl: row.ctaUrl,
  }

  // Categorías padre seguidas de sus subcategorías, igual que en el formulario de banners.
  const categories: CategoryOption[] = categoryRows
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((parent) => [
      { slug: parent.slug, name: parent.name, isChild: false },
      ...categoryRows
        .filter((c) => c.parentId === parent.id)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((child) => ({ slug: child.slug, name: child.name, isChild: true })),
    ])

  const products: ProductOption[] = productRows

  return <PromoModalManager promo={promo} categories={categories} products={products} />
}
