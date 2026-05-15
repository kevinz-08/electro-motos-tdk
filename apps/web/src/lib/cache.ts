/**
 * Capa de caché para las páginas públicas de la tienda.
 *
 * Usa `unstable_cache` de Next.js para cachear queries de Prisma y use cases
 * de dominio. Cada entrada tiene tags para invalidación granular desde el
 * panel admin vía `revalidateTag`.
 *
 * Tags y su semántica:
 *   products   → cualquier listado o detalle de producto
 *   categories → cualquier listado de categorías
 *   home       → datos específicos de la home (featured products)
 *   catalog    → datos de la vista landing del catálogo
 *
 * TTLs:
 *   300 s (5 min)  — productos y featured (cambian con ventas/stock)
 *   3600 s (1 h)   — categorías (cambian raramente)
 *   180 s (3 min)  — grid filtrado (búsquedas con filtros activos)
 */
import { unstable_cache } from 'next/cache'
import { prisma } from '@/infrastructure/database/prisma-client'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { ListProducts, GetProductBySlug } from '@h2r/domain'

// ── Tag constants ─────────────────────────────────────────────────────────────

export const CACHE_TAGS = {
  products: 'products',
  categories: 'categories',
  home: 'home',
  catalog: 'catalog',
} as const

// ── Home ──────────────────────────────────────────────────────────────────────

/** Categorías raíz para la sección de navegación de la home */
export const getCachedHomeCategories = unstable_cache(
  async () => {
    return prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
    })
  },
  ['home-categories'],
  { revalidate: 3600, tags: [CACHE_TAGS.categories] },
)

/**
 * 4 productos aleatorios con stock para la sección "Productos destacados".
 * ORDER BY RANDOM() → los productos rotan cada 5 min (revalidate: 300).
 */
export const getCachedFeaturedProducts = unstable_cache(
  async () => {
    const repo = new PrismaProductRepository()
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product" WHERE stock > 0 AND "isActive" = true ORDER BY RANDOM() LIMIT 4
    `
    if (rows.length === 0) return []
    return Promise.all(rows.map((r) => repo.findById(r.id).then((p) => p!)))
  },
  ['home-featured-products'],
  { revalidate: 300, tags: [CACHE_TAGS.products, CACHE_TAGS.home] },
)

// ── Catalog landing ───────────────────────────────────────────────────────────

export type CachedLandingData = {
  parentsRaw: Array<{
    id: string
    name: string
    slug: string
    description: string | null
    children: Array<{ id: string }>
  }>
  allProducts: Array<{
    id: string; name: string; slug: string; description: string
    price: number; stock: number; sku: string; images: string[]
    isActive: boolean; categoryId: string
    createdAt: string; updatedAt: string
  }>
  countRows: Array<{ categoryId: string; _count: number }>
}

/**
 * Datos para la vista landing del catálogo (sin filtros).
 * Retorna las 3 queries del catálogo como datos crudos; la página ensambla
 * la vista final en memoria sin tocar la DB.
 */
export const getCachedCatalogLanding = unstable_cache(
  async (): Promise<CachedLandingData> => {
    const parentsRaw = await prisma.category.findMany({
      where: { parentId: null },
      include: { children: { select: { id: true } } },
      orderBy: { name: 'asc' },
    })

    const allCategoryIds = parentsRaw.flatMap((p) => [
      p.id,
      ...p.children.map((c) => c.id),
    ])

    const [allProducts, countRows] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, stock: { gt: 0 }, categoryId: { in: allCategoryIds } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.groupBy({
        by: ['categoryId'],
        where: { isActive: true, categoryId: { in: allCategoryIds } },
        _count: true,
      }),
    ])

    return {
      parentsRaw,
      allProducts: allProducts.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      countRows: countRows.map((r) => ({
        categoryId: r.categoryId,
        _count: r._count,
      })),
    }
  },
  ['catalog-landing'],
  { revalidate: 300, tags: [CACHE_TAGS.products, CACHE_TAGS.catalog, CACHE_TAGS.categories] },
)

// ── Catalog grid (parameterized) ──────────────────────────────────────────────

export type CatalogGridParams = {
  categorySlug?: string
  search?: string
  page: number
  inStock?: boolean
  minPrice?: number
  maxPrice?: number
}

type ParentCategorySlim = {
  id: string; name: string; slug: string
  children: Array<{ id: string; name: string; slug: string }>
}

/**
 * Datos para la vista grid del catálogo (con filtros activos).
 * El parámetro `params` forma parte de la clave de caché — cada combinación
 * única de filtros tiene su propia entrada.
 */
export const getCachedCatalogGrid = unstable_cache(
  async (params: CatalogGridParams) => {
    const repo = new PrismaProductRepository()
    const [result, parentCategories] = await Promise.all([
      new ListProducts(repo).execute({ ...params, limit: 12 }),
      prisma.category.findMany({
        where: { parentId: null },
        include: { children: { select: { id: true, name: true, slug: true } } },
        orderBy: { name: 'asc' },
      }) as Promise<ParentCategorySlim[]>,
    ])
    return { result, parentCategories }
  },
  ['catalog-grid'],
  { revalidate: 180, tags: [CACHE_TAGS.products, CACHE_TAGS.catalog, CACHE_TAGS.categories] },
)

// ── Product detail ────────────────────────────────────────────────────────────

/**
 * Detalle de producto por slug.
 * Se invalida con `revalidateTag('products')` cuando cualquier producto es
 * modificado desde el panel admin.
 */
export const getCachedProductBySlug = unstable_cache(
  async (slug: string) => {
    const repo = new PrismaProductRepository()
    return new GetProductBySlug(repo).execute(slug)
  },
  ['product-by-slug'],
  { revalidate: 300, tags: [CACHE_TAGS.products] },
)
