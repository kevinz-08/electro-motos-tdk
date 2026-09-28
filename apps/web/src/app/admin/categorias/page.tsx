import type { Metadata } from 'next'
import { BRAND_CATEGORIES_SETTING_KEY, parseBrandCategorySlugs } from '@h2r/domain'
import { prisma } from '@/infrastructure/database/prisma-client'
import { CategoryManager, type CategoryRow } from '@/components/admin/CategoryManager'

export const metadata: Metadata = { title: 'Categorías' }

export default async function AdminCategoriasPage() {
  const [rows, brandSetting] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true } },
      },
    }),
    prisma.settings.findUnique({ where: { key: BRAND_CATEGORIES_SETTING_KEY } }),
  ])
  // Subcategorías que son marcas: el Índice de Precios las suma a su categoría padre (H-55).
  const brandSlugs = new Set(parseBrandCategorySlugs(brandSetting?.value))

  const categories: CategoryRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    imageUrl: r.imageUrl,
    parentId: r.parentId,
    parent: r.parent,
    _count: { products: r._count.products },
    isBrand: brandSlugs.has(r.slug),
  }))

  return <CategoryManager categories={categories} />
}
