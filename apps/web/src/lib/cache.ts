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
 *   hero       → banners del carrusel hero de la home
 *   promo      → pop-up promocional de la home
 *   settings   → umbrales de prueba social y estimación de entrega
 *   fitments   → catálogo de motos y compatibilidades verificadas
 *
 *   product:<slug> → la ficha de un producto (stock tras una venta; ver productTag)
 *
 * SIN TTL (README §27): todo se cachea con `revalidate: false` y solo se
 * invalida con `revalidateTag`. Neon cobra por tiempo de compute encendido, y
 * los TTL de 3–60 min hacían que los bots lo mantuvieran despierto todo el día.
 * Quien cambie un dato público debe invalidar su tag: el panel admin vía
 * `/api/admin/revalidate` y el API (ventas, devoluciones, sync de stock) vía
 * `/api/internal/revalidate`.
 *
 * `cached()` además envuelve cada función en `React.cache`, así varias llamadas
 * en el mismo render (generateMetadata + página + layout) comparten resultado.
 */
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/infrastructure/database/prisma-client'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import {
  PrismaFitmentRepository,
  PrismaMotorcycleRepository,
  PrismaOemReferenceRepository,
} from '@/infrastructure/repositories/PrismaMotorcycleRepository'
import {
  ListProducts,
  GetProductBySlug,
  GetModelHub,
  FindByOemReference,
  CRO_SETTING_KEYS,
  parseCroSettings,
  summarizeReviews,
} from '@h2r/domain'
import { CACHE_TAGS, productTag } from './cache-tags'
import { installedMotorcycleLabel, installedMotorcycleLine } from './review-motorcycle'
import { findCrossSellSuggestions } from './cross-sell'
import { findKitsByModel, findKitBySlug, findAllVisibleKits, findKitsContainingProduct } from './kits'
import { findMaintenanceGuide, findReviewerBySlug, findPublishedGuideEntries, hasPublishedGuide } from './guides'
import { findPublishedArticle, findPublishedArticlesByModel } from './articles'
import { findPublishedPriceIndex } from './price-index'
import { findStoreFacts } from './store-facts'

export { CACHE_TAGS }

/**
 * `unstable_cache` sin expiración por tiempo + `React.cache` para deduplicar
 * dentro de un render. Los argumentos de la función forman parte de la clave.
 */
function cached<A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string, tags: string[]) {
  return cache(unstable_cache(fn, [key], { revalidate: false, tags }))
}

// ── Home ──────────────────────────────────────────────────────────────────────

/** Categorías raíz para la sección de navegación de la home */
export const getCachedHomeCategories = cached(
  async () => {
    return prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
    })
  },
  'home-categories',
  [CACHE_TAGS.categories],
)

/** Cuántos candidatos cachea el servidor para "Productos destacados". */
export const FEATURED_POOL_SIZE = 12

/**
 * Candidatos para "Productos destacados": los 12 productos con stock más
 * recientes. Antes era `ORDER BY RANDOM() LIMIT 4` con TTL de 5 min; sin TTL
 * quedaría congelado, así que el orden aleatorio se hace en el navegador
 * (`FeaturedProducts` baraja y muestra 4).
 */
export const getCachedFeaturedProducts = cached(
  async () => {
    const repo = new PrismaProductRepository()
    // `deletedAt: null` es obligatorio: `repo.findById()` filtra los borrados y
    // devolvería null para un id de la papelera con stock > 0.
    const rows = await prisma.product.findMany({
      where: { stock: { gt: 0 }, isActive: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: FEATURED_POOL_SIZE,
      select: { id: true },
    })
    if (rows.length === 0) return []
    const products = await Promise.all(rows.map((r) => repo.findById(r.id)))
    // Cinturón y tirantes: si un producto se borra entre el SELECT y el findById.
    return products.filter((p): p is NonNullable<typeof p> => p !== null)
  },
  'home-featured-pool',
  [CACHE_TAGS.products, CACHE_TAGS.home],
)

/** Banners activos del carrusel hero, en el orden definido desde /admin/banners. */
export const getCachedHeroBanners = cached(
  async () => {
    return prisma.heroBanner.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    })
  },
  'home-hero-banners',
  [CACHE_TAGS.hero],
)

// ── Catalog landing ───────────────────────────────────────────────────────────

/** Cuántos productos se muestran por sección de categoría padre en el landing. */
const LANDING_PRODUCTS_PER_CATEGORY = 8

export type CachedLandingData = {
  parentsRaw: Array<{
    id: string
    name: string
    slug: string
    description: string | null
    children: Array<{ id: string }>
  }>
  /** Hasta `LANDING_PRODUCTS_PER_CATEGORY` productos por categoría padre, ya recortados en la query. */
  productsByCategory: Record<string, Array<{
    id: string; name: string; slug: string; description: string
    price: number; compareAtPrice: number | null; stock: number; sku: string; images: string[]
    isActive: boolean; categoryId: string
    createdAt: string; updatedAt: string
  }>>
  countRows: Array<{ categoryId: string; _count: number }>
}

/**
 * Datos para la vista landing del catálogo (sin filtros).
 * Retorna las queries del catálogo como datos crudos; la página ensambla
 * la vista final en memoria sin tocar la DB.
 *
 * Los productos se piden con `take: LANDING_PRODUCTS_PER_CATEGORY` por categoría padre
 * (una query por padre, en paralelo) en vez de traer todo el catálogo activo con stock
 * de una sola vez — esa query sin límite no escalaba con el crecimiento del catálogo.
 */
export const getCachedCatalogLanding = cached(
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

    const [productsByParent, countRows] = await Promise.all([
      Promise.all(
        parentsRaw.map((p) =>
          prisma.product.findMany({
            where: {
              isActive: true,
              stock: { gt: 0 },
              categoryId: { in: [p.id, ...p.children.map((c) => c.id)] },
            },
            orderBy: { createdAt: 'desc' },
            take: LANDING_PRODUCTS_PER_CATEGORY,
          }),
        ),
      ),
      prisma.product.groupBy({
        by: ['categoryId'],
        where: { isActive: true, categoryId: { in: allCategoryIds } },
        _count: true,
      }),
    ])

    const productsByCategory: CachedLandingData['productsByCategory'] = {}
    parentsRaw.forEach((p, i) => {
      productsByCategory[p.id] = productsByParent[i].map((prod) => ({
        ...prod,
        createdAt: prod.createdAt.toISOString(),
        updatedAt: prod.updatedAt.toISOString(),
      }))
    })

    return {
      parentsRaw,
      productsByCategory,
      countRows: countRows.map((r) => ({
        categoryId: r.categoryId,
        _count: r._count,
      })),
    }
  },
  'catalog-landing',
  [CACHE_TAGS.products, CACHE_TAGS.catalog, CACHE_TAGS.categories],
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
export const getCachedCatalogGrid = cached(
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
  'catalog-grid',
  [CACHE_TAGS.products, CACHE_TAGS.catalog, CACHE_TAGS.categories],
)

// ── Product detail ────────────────────────────────────────────────────────────

/**
 * Detalle de producto por slug. Además de `products` lleva `product:<slug>`:
 * una venta (stock que cambia) invalida solo esta ficha — el API la avisa vía
 * `/api/internal/revalidate` (README §27).
 */
export const getCachedProductBySlug = cache((slug: string) =>
  unstable_cache(
    async () => {
      const repo = new PrismaProductRepository()
      return new GetProductBySlug(repo).execute(slug)
    },
    ['product-by-slug', slug],
    { revalidate: false, tags: [CACHE_TAGS.products, productTag(slug)] },
  )(),
)

/**
 * Campos de la ficha que la entidad de dominio no lleva (descripción completa,
 * mpn, marca, garantía, categoría para las migas) y la descripción
 * estructurada. Antes se leían sin caché en cada regeneración de la ficha.
 */
export const getCachedProductDetail = cached(
  async (productId: string) => {
    const [product, structuredDescription] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        select: {
          description: true,
          mpn: true,
          partBrand: true,
          warrantyMonths: true,
          category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } },
        },
      }),
      prisma.productDescription.findUnique({
        where: { productId },
        include: {
          benefits: { orderBy: { order: 'asc' } },
          compatibility: { orderBy: { order: 'asc' } },
        },
      }),
    ])
    return { product, structuredDescription }
  },
  'product-detail',
  [CACHE_TAGS.products],
)

/** Pop-up promocional activo de la home, o null si está desactivado o sin configurar. */
export const getCachedPromoModal = cached(
  async () => {
    const promo = await prisma.promoModal.findUnique({ where: { id: 'default' } })
    if (!promo || !promo.isActive) return null
    return {
      desktopImageUrl: promo.desktopImageUrl,
      mobileImageUrl: promo.mobileImageUrl,
      altText: promo.altText,
      ctaUrl: promo.ctaUrl,
      version: promo.updatedAt.toISOString(),
    }
  },
  'promo-modal',
  [CACHE_TAGS.promo],
)

// ── Settings de conversión ────────────────────────────────────────────────────

/** Umbrales de prueba social y estimación de entrega, con defaults si no hay filas. */
export const getCachedCroSettings = cached(
  async () => {
    const rows = await prisma.settings.findMany({
      where: { key: { in: Object.values(CRO_SETTING_KEYS) } },
    })
    return parseCroSettings(rows)
  },
  'cro-settings',
  [CACHE_TAGS.settings],
)

// ── Reseñas ───────────────────────────────────────────────────────────────────

/**
 * Resumen de reseñas APROBADAS de un producto + las 6 más recientes (README §22.6).
 * Tag `products`: la moderación en /admin/resenas invalida este tag.
 */
export const getCachedProductReviews = cached(
  async (productId: string) => {
    const [ratings, latest] = await Promise.all([
      prisma.productReview.findMany({
        where: { productId, status: 'APPROVED' },
        select: { rating: true, recommends: true },
      }),
      prisma.productReview.findMany({
        where: { productId, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true, rating: true, recommends: true, comment: true, authorName: true, createdAt: true,
          installedCity: true,
          installedModel: { select: { name: true, brand: { select: { name: true } } } },
        },
      }),
    ])
    return {
      summary: summarizeReviews(ratings),
      latest: latest.map(({ installedModel, installedCity, ...r }) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        installedLine: installedMotorcycleLine(installedMotorcycleLabel(installedModel), installedCity, r.recommends),
      })),
    }
  },
  'product-reviews',
  [CACHE_TAGS.products],
)

/**
 * Prueba social de la home (Fase 4, H-01): reseñas APROBADAS de toda la tienda.
 *
 * Es la única fuente de `SocialProof`. Devuelve las últimas reseñas que traen
 * comentario — sin filtrar por estrellas: elegir solo las positivas sería
 * seleccionar a conveniencia — y el resumen sobre TODAS las aprobadas. Sin
 * reseñas devuelve `summary: null` y `latest: []`, y la sección no se pinta.
 * Tag `products`: la moderación en /admin/resenas invalida este tag.
 */
export const getCachedStoreReviews = cached(
  async () => {
    const [ratings, latest] = await Promise.all([
      prisma.productReview.findMany({
        where: { status: 'APPROVED', product: { deletedAt: null } },
        select: { rating: true, recommends: true },
      }),
      prisma.productReview.findMany({
        where: {
          status: 'APPROVED',
          comment: { not: null },
          product: { deletedAt: null, isActive: true },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          rating: true,
          recommends: true,
          comment: true,
          authorName: true,
          createdAt: true,
          installedCity: true,
          installedModel: { select: { name: true, brand: { select: { name: true } } } },
          product: { select: { name: true, slug: true } },
        },
      }),
    ])
    return {
      summary: summarizeReviews(ratings),
      latest: latest
        .filter((r) => (r.comment ?? '').trim().length > 0)
        .map(({ installedModel, installedCity, ...r }) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          installedLine: installedMotorcycleLine(installedMotorcycleLabel(installedModel), installedCity, r.recommends),
        })),
    }
  },
  'store-reviews',
  [CACHE_TAGS.products, CACHE_TAGS.home],
)

// ── Related products ──────────────────────────────────────────────────────────

/**
 * Hasta 4 productos de la misma categoría, excluyendo el producto actual.
 * Usado en la sección "Productos relacionados" al pie de la página de detalle.
 * Los argumentos (categoryId + excludeSlug) forman parte de la clave de caché.
 */
export const getCachedRelatedProducts = cached(
  async (categoryId: string, excludeSlug: string) => {
    const repo = new PrismaProductRepository()
    return repo.findRelatedByCategory(categoryId, excludeSlug)
  },
  'related-products',
  [CACHE_TAGS.products],
)

/**
 * Sugerencias de venta cruzada de un producto (docs/seo/plan-venta-cruzada.md).
 * Tags `products` y `fitments`: guardar el producto en el admin invalida
 * `products`, y una carga de compatibilidades invalida `fitments`.
 */
export const getCachedCrossSells = cached(
  async (productId: string) => findCrossSellSuggestions(productId),
  'cross-sells',
  [CACHE_TAGS.products, CACHE_TAGS.fitments],
)

/**
 * Kits de productos (docs/seo/plan-kits.md, Fase 4 ítem 8). Tags `kits`,
 * `products` y `fitments`: cambia con el precio/stock de sus productos, con
 * la edición del kit en el admin y con las compatibilidades cargadas.
 */
const KIT_CACHE_TAGS = [CACHE_TAGS.kits, CACHE_TAGS.products, CACHE_TAGS.fitments]

export const getCachedKitsByModel = cached(
  async (modelId: string) => findKitsByModel(modelId),
  'kits-by-model',
  KIT_CACHE_TAGS,
)

export const getCachedKitBySlug = cached(
  async (slug: string) => findKitBySlug(slug),
  'kit-by-slug',
  KIT_CACHE_TAGS,
)

export const getCachedAllVisibleKits = cached(
  async () => findAllVisibleKits(),
  'kits-all-visible',
  KIT_CACHE_TAGS,
)

export const getCachedKitsContainingProduct = cached(
  async (productId: string) => findKitsContainingProduct(productId),
  'kits-containing-product',
  KIT_CACHE_TAGS,
)

/**
 * Revisores técnicos y guías de mantenimiento (docs/seo/, Fase 5). Tag `guides`
 * (lo invalida el admin al guardar) más `products`, porque cada punto de control
 * muestra el precio y el stock reales del repuesto enlazado.
 */
const GUIDE_CACHE_TAGS = [CACHE_TAGS.guides, CACHE_TAGS.products]

export const getCachedMaintenanceGuide = cached(
  async (brandSlug: string, modelSlug: string) => findMaintenanceGuide(brandSlug, modelSlug),
  'maintenance-guide',
  GUIDE_CACHE_TAGS,
)

export const getCachedReviewerBySlug = cached(
  async (slug: string) => findReviewerBySlug(slug),
  'reviewer-by-slug',
  GUIDE_CACHE_TAGS,
)

export const getCachedPublishedGuideEntries = cached(
  async () => findPublishedGuideEntries(),
  'published-guide-entries',
  GUIDE_CACHE_TAGS,
)

export const getCachedHasPublishedGuide = cached(
  async (modelId: string) => hasPublishedGuide(modelId),
  'has-published-guide',
  GUIDE_CACHE_TAGS,
)

/** Artículo publicado por slug (Fase 5, ítem 1). Mismo tag que las guías. */
export const getCachedPublishedArticle = cached(
  async (slug: string) => findPublishedArticle(slug),
  'published-article',
  GUIDE_CACHE_TAGS,
)

/** Último corte publicado del Índice de Precios (Fase 5, ítem 4). Lo invalida el admin al publicar. */
export const getCachedPublishedPriceIndex = cached(
  async () => findPublishedPriceIndex(),
  'published-price-index',
  [CACHE_TAGS.priceIndex],
)

/**
 * Hechos verificables de la tienda (Fase 6 — `/llms.txt` y "Por qué comprar en
 * H2R"). Cambian con el catálogo, las compatibilidades, las guías y los ajustes.
 */
export const getCachedStoreFacts = cached(
  async () => findStoreFacts(),
  'store-facts',
  [CACHE_TAGS.products, CACHE_TAGS.fitments, CACHE_TAGS.settings, CACHE_TAGS.guides],
)

/** Artículos publicados sobre un modelo (enlazado hub ↔ guías, Fase 5). */
export const getCachedArticlesByModel = cached(
  async (modelId: string) => findPublishedArticlesByModel(modelId),
  'articles-by-model',
  GUIDE_CACHE_TAGS,
)

// ── Compatibilidad por modelo de moto (docs/seo/, Fase 2) ─────────────────────
//
// Todo lo que sale de aquí está ya filtrado por `verified: true` en el
// repositorio: la caché nunca guarda compatibilidades sin verificar.

/**
 * Hub de un modelo: el modelo, sus categorías con conteo y el total.
 * Devuelve un Result — `NOT_FOUND` si el modelo no existe o no tiene ningún
 * repuesto compatible verificado (no se publican hubs vacíos).
 */
export const getCachedModelHub = cached(
  async (brandSlug: string, modelSlug: string, categorySlug?: string) => {
    const repo = new PrismaMotorcycleRepository()
    return new GetModelHub(repo).execute({ brandSlug, modelSlug, categorySlug })
  },
  'model-hub',
  [CACHE_TAGS.fitments, CACHE_TAGS.products],
)

/**
 * Modelos publicables: los que tienen al menos un producto vendible con fitment
 * verificado. Alimenta `generateStaticParams` y el sitemap de modelos.
 */
export const getCachedPublishableModels = cached(
  async () => new PrismaMotorcycleRepository().findModelsWithVerifiedFitments(),
  'publishable-models',
  [CACHE_TAGS.fitments, CACHE_TAGS.products],
)

/** Marcas y modelos activos para el selector "¿Qué moto tienes?". */
export const getCachedMotorcycleCatalog = cached(
  async () => {
    const repo = new PrismaMotorcycleRepository()
    const [brands, models] = await Promise.all([repo.findBrands(), repo.findAllModels()])
    return {
      brands: brands.map((b) => ({ slug: b.slug, name: b.name })),
      models: models.map((m) => ({
        slug: m.slug,
        name: m.name,
        brandSlug: m.brand.slug,
        brandName: m.brand.name,
        cc: m.cc,
      })),
    }
  },
  'motorcycle-catalog',
  [CACHE_TAGS.fitments],
)

/** Compatibilidades verificadas de un producto — tabla "Compatible con" de la ficha. */
export const getCachedProductFitments = cached(
  async (productId: string) => {
    const [fitments, oemReferences] = await Promise.all([
      new PrismaFitmentRepository().findVerifiedByProduct(productId),
      new PrismaOemReferenceRepository().findByProduct(productId),
    ])
    return { fitments, oemReferences }
  },
  'product-fitments',
  [CACHE_TAGS.fitments, CACHE_TAGS.products],
)

/** IDs de productos compatibles con un modelo, opcionalmente de una categoría. */
export const getCachedProductIdsByModel = cached(
  async (modelId: string, categoryId?: string) =>
    new PrismaFitmentRepository().findProductIdsByModel(modelId, categoryId),
  'products-by-model',
  [CACHE_TAGS.fitments, CACHE_TAGS.products],
)

/** Búsqueda por referencia OEM — resuelve /referencia/[oem]. */
export const getCachedOemSearch = cached(
  async (reference: string) => {
    const repo = new PrismaOemReferenceRepository()
    return new FindByOemReference(repo).execute({ reference })
  },
  'oem-search',
  [CACHE_TAGS.fitments, CACHE_TAGS.products],
)

/** Cuántas compatibilidades verificadas tiene el catálogo — dato real, calculado. */
export const getCachedVerifiedFitmentCount = cached(
  async () => new PrismaFitmentRepository().countVerified(),
  'verified-fitment-count',
  [CACHE_TAGS.fitments],
)

// ── Lecturas que antes iban sin caché (README §27) ────────────────────────────

/**
 * Categoría + número de productos activos para la metadata de
 * `/catalogo?category=<slug>`. `/catalogo` es dinámico (searchParams), así que
 * sin caché cada visita de un bot a una categoría hacía dos queries.
 * Un slug inexistente devuelve null y también queda en caché.
 */
export const getCachedCategoryMeta = cached(
  async (slug: string) => {
    const category = await prisma.category.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, description: true },
    })
    if (!category) return null
    const productCount = await prisma.product.count({
      where: { categoryId: category.id, isActive: true, deletedAt: null },
    })
    return { ...category, productCount }
  },
  'category-meta',
  [CACHE_TAGS.categories, CACHE_TAGS.products],
)

/** Categorías raíz con sus hijas y conteo de productos — índice de `/llms.txt`. */
export const getCachedCategoryTree = cached(
  async () =>
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
      select: {
        name: true,
        slug: true,
        children: { orderBy: { name: 'asc' }, select: { name: true, _count: { select: { products: true } } } },
      },
    }),
  'category-tree',
  [CACHE_TAGS.categories, CACHE_TAGS.products],
)

/**
 * Ciudades de Vendelo para el selector del checkout. Se cachea la tabla entera
 * (unos pocos miles de filas, la carga un script y no cambia desde la tienda) y
 * se filtra en memoria: cachear por texto buscado crearía una entrada por tecla.
 */
export const getCachedVendeloCities = cached(
  async () =>
    prisma.vendeloCity.findMany({
      select: { code: true, name: true, subdivisionCode: true },
      orderBy: { name: 'asc' },
    }),
  'vendelo-cities',
  [CACHE_TAGS.vendeloCities],
)
