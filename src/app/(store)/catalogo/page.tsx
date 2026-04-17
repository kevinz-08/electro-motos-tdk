/**
 * Catálogo de productos — dos vistas:
 *
 * LANDING  (sin filtros activos → /catalogo)
 *   1. Hero full-screen con parallax (Banner-catalogo.jpg)
 *   2. Carrusel horizontal "Explorar por categoría" (imágenes retrato)
 *   3. Secciones por categoría con scroll vertical:
 *      - Banner hero por categoría (bg-fixed parallax + CTA "Ver más")
 *      - "Productos Populares" (carrusel horizontal de ProductCards)
 *   4. Trust strip + WhatsApp CTA
 *
 * GRID     (category / search / inStock activos → /catalogo?category=X)
 *   Breadcrumb + trust strip + sidebar + grid de productos + paginación.
 *
 * Server Component. Tema claro/oscuro → CatalogThemeWrapper (client).
 */
import Link from 'next/link'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { ListProducts } from '@/domain/use-cases/products/ListProducts'
import { ProductCard } from '@/components/store/ProductCard'
import { CatalogThemeWrapper } from '@/components/store/CatalogThemeWrapper'
import { CatalogHero } from '@/components/store/CatalogHero'
import { CategoryExploreCarousel } from '@/components/store/CategoryExploreCarousel'
import { CategoryHeroBanner } from '@/components/store/CategoryHeroBanner'
import { ProductCarousel } from '@/components/store/ProductCarousel'
import { FilterDrawer } from '@/components/store/FilterDrawer'
import { prisma } from '@/infrastructure/database/prisma-client'
import type { Product } from '@/domain/entities/Product'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    category?: string
    search?: string
    page?: string
    inStock?: string
    minPrice?: string
    maxPrice?: string
    showAll?: string
  }>
}

type PrismaProduct = {
  id: string; name: string; slug: string; description: string
  price: number; stock: number; sku: string; images: string[]
  isActive: boolean; categoryId: string; createdAt: Date; updatedAt: Date
}

type CategoryFull = {
  id: string; name: string; slug: string; description: string | null
  _count: { products: number }
  products: PrismaProduct[]
}

// Para la vista Grid solo necesitamos el conteo, sin los productos
type CategorySlim = {
  id: string; name: string; slug: string; description: string | null
  _count: { products: number }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Mapea un producto Prisma a la entidad de dominio */
function toDomain(p: PrismaProduct): Product {
  return {
    id: p.id, name: p.name, slug: p.slug, description: p.description,
    price: p.price, stock: p.stock, sku: p.sku, images: p.images,
    isActive: p.isActive, categoryId: p.categoryId,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
  }
}

function buildUrl(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
) {
  const merged = { ...base, ...overrides }
  const clean = Object.fromEntries(
    Object.entries(merged).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, string>
  const qs = new URLSearchParams(clean).toString()
  return `/catalogo${qs ? `?${qs}` : ''}`
}

// ── Metadata de categorías ────────────────────────────────────────────────────

const CAT: Record<string, { icon: string; desc: string }> = {
  'frenos':            { icon: '', desc: 'Mantén el control en cada curva. Pastillas, discos y kits de frenos de alta calidad para todas las marcas.' },
  'motores':           { icon: '',  desc: 'El corazón de tu moto siempre al máximo. Pistones, anillos, cigüeñales y repuestos para un rendimiento óptimo.' },
  'llantas':           { icon: '', desc: 'Agarre que inspira confianza. Llantas para asfalto, campo y todo tipo de terreno.' },
  'sistema-electrico': { icon: '',  desc: 'Mantén el sistema eléctrico en perfectas condiciones. Reguladores, fusibles e interruptores.' },
  'arneses':           { icon: '', desc: 'Conexiones confiables para tu moto. Arneses de cableado y conectores de calidad.' },
  'baterias':          { icon: '', desc: 'Arranque garantizado en todo momento. Baterías de larga duración para todas las marcas.' },
  'iluminacion':       { icon: '', desc: 'Ve y sé visto en la vía. Bombillas, faros LED y luces de alta visibilidad.' },
  'accesorios':        { icon: '', desc: 'Personaliza y equipa tu moto con accesorios de alta calidad.' },
  'filtros':           { icon: '', desc: 'Protege el motor de tu moto. Filtros de aire y aceite de alta eficiencia.' },
  'repuestos-motor':   { icon: '', desc: 'Todo lo que necesitas para el motor. Repuestos genuinos para mantener tu moto impecable.' },
}

const catIcon = (slug: string) => CAT[slug]?.icon ?? '📦'
const catDesc = (slug: string) => CAT[slug]?.desc ?? 'Repuestos de alta calidad para tu moto.'

// Imágenes de banner por categoría (reemplazar con fotos reales)
const BANNER_FALLBACK = '/assets/bannerByCategory/banner-category-example.jpg'
const BANNER: Record<string, string> = {
  'frenos':            '/assets/bannerByCategory/frenos.jpg',
  'motores':           '/assets/bannerByCategory/motores.jpg',
  'llantas':           '/assets/bannerByCategory/llantas.jpg',
  'sistema-electrico': '/assets/bannerByCategory/sistema-electrico.jpg',
  'arneses':           '/assets/bannerByCategory/arneses.jpg',
  'baterias':          '/assets/bannerByCategory/baterias.jpg',
  'iluminacion':       '/assets/bannerByCategory/iluminacion.jpg',
  'accesorios':        '/assets/bannerByCategory/accesorios.jpg',
  'filtros':           '/assets/bannerByCategory/filtros.jpg',
  'repuestos-motor':   '/assets/bannerByCategory/repuestos-motor.jpg',
}
const getBanner = (slug: string) => BANNER[slug] ?? BANNER_FALLBACK

// ── Trust items ───────────────────────────────────────────────────────────────

const TRUST = [
  { icon: <svg key="t1" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7"/></svg>, label: 'Envío a todo el país' },
  { icon: <svg key="t2" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>, label: 'Pago 100% seguro' },
  { icon: <svg key="t3" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>, label: 'Garantía incluida' },
  { icon: <svg key="t4" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>, label: 'Asesoría por WhatsApp' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams
  const isGridView = !!(params.category || params.search || params.inStock || params.minPrice || params.maxPrice || params.showAll)

  const repo = new PrismaProductRepository()

  if (isGridView) {
    // === VISTA GRID ===
    const page = Number(params.page ?? 1)

    const [result, categories] = await Promise.all([
      new ListProducts(repo).execute({
        categorySlug: params.category,
        search: params.search,
        page,
        limit: 12,
        inStock: params.inStock === 'true' ? true : undefined,
        // Los params de precio vienen en pesos COP; la BD los almacena en centavos
        minPrice: params.minPrice ? Number(params.minPrice) : undefined,
        maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
      }),
      prisma.category.findMany({
        include: { _count: { select: { products: { where: { isActive: true } } } } },
        orderBy: { name: 'asc' },
      }) as unknown as Promise<CategorySlim[]>,
    ])

    const { items, total, limit } = result.ok
      ? result.value
      : { items: [], total: 0, limit: 12 }

    const totalPages = Math.ceil(total / limit)
    const activeCat = categories.find((c) => c.slug === params.category)

    return (
      <CatalogThemeWrapper>
        <GridView
          items={items}
          categories={categories}
          activeCat={activeCat}
          params={params}
          total={total}
          page={page}
          totalPages={totalPages}
        />
      </CatalogThemeWrapper>
    )
  }

  // === VISTA LANDING ===
  // Traer categorías con sus productos (top 8 con stock por categoría)
  const categoriesRaw = await prisma.category.findMany({
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
      products: {
        where: { isActive: true, stock: { gt: 0 } },
        take: 8,
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  }) as CategoryFull[]

  // Solo mostrar categorías que tienen productos
  const categories = categoriesRaw.filter((c) => c._count.products > 0)
  const totalProducts = categoriesRaw.reduce((sum, c) => sum + c._count.products, 0)

  return (
    <CatalogThemeWrapper>
      <LandingView categories={categories} totalProducts={totalProducts} />
    </CatalogThemeWrapper>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA LANDING
// ─────────────────────────────────────────────────────────────────────────────

function LandingView({
  categories,
  totalProducts,
}: {
  categories: CategoryFull[]
  totalProducts: number
}) {
  return (
    <div className="c-bg">

      {/* ── 1. HERO con parallax ──────────────────────────────────── */}
      <CatalogHero>
        <div className="text-center text-white max-w-3xl mx-auto px-4">
          <h1 className="text-5xl sm:text-7xl font-black leading-[1.0] mb-5 drop-shadow-lg">
            Todo lo que<br />tu moto necesita
          </h1>
          <p className="text-white/55 text-sm mb-10">
            <span className="font-semibold text-white/75">{totalProducts}+ productos</span>
            {' · '}
            {categories.length} categorías
          </p>

          <form method="GET" action="/catalogo" className="flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                name="search"
                placeholder="Buscar por nombre, SKU o modelo..."
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl pl-11 pr-4 py-4 text-sm text-white placeholder-white/35 focus:outline-none focus:border-white/50 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="shrink-0 bg-blue-600 text-white px-7 py-4 rounded-xl text-sm font-bold hover:bg-blue-500 active:scale-95 transition-all"
            >
              Buscar
            </button>
          </form>

          {/* CTA — ver catálogo completo */}
          <div className="mt-6">
            <Link
              href="/catalogo?showAll=true"
              className="inline-flex items-center gap-2 text-white/70 text-sm font-medium hover:text-white transition-colors border border-white/20 hover:border-white/40 px-6 py-3 rounded-xl backdrop-blur-sm hover:bg-white/5"
            >
              Ver catálogo completo
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </CatalogHero>

      {/* ── 2. CARRUSEL "Explorar por categoría" ─────────────────── */}
      <section className="c-bg border-b c-divider py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CategoryExploreCarousel
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              productCount: c._count.products,
            }))}
          />
        </div>
      </section>

      {/* ── 3. SECCIONES POR CATEGORÍA (scroll vertical) ─────────── */}
      {categories.map((cat) => (
        <section key={cat.id} className="border-t c-divider">

          {/* 3.1 Banner hero de categoría */}
          <CategoryHeroBanner
            slug={cat.slug}
            name={cat.name}
            description={catDesc(cat.slug)}
            imageSrc={getBanner(cat.slug)}
          />

          {/* 3.2 Productos populares */}
          {cat.products.length > 0 && (
            <div className="c-bg py-10 px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black c-text">Productos Populares</h3>
                    <p className="text-xs c-text-3 mt-0.5">
                      {catIcon(cat.slug)} {cat.name}
                    </p>
                  </div>
                  <Link
                    href={`/catalogo?category=${cat.slug}`}
                    className="text-sm font-semibold c-active-text hover:underline shrink-0"
                  >
                    Ver todos ({cat._count.products}) →
                  </Link>
                </div>

                <ProductCarousel products={cat.products.map(toDomain)} />
              </div>
            </div>
          )}
        </section>
      ))}

      {/* ── 4. TRUST STRIP ───────────────────────────────────────── */}
      <section className="border-t c-divider c-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRUST.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-blue-500 shrink-0">{item.icon}</span>
                <span className="text-sm font-semibold c-text-2">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. WHATSAPP CTA ──────────────────────────────────────── */}
      <section className="border-t c-divider c-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="c-surface border c-border rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold c-text">¿No encuentras lo que buscas?</h3>
              <p className="text-sm c-text-3 mt-1">
                Escríbenos por WhatsApp y te ayudamos a encontrar la pieza exacta.
              </p>
            </div>
            <a
              href="https://wa.me/573000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-2.5 bg-[#25D366] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#22c35e] active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Contactar ahora
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VISTA GRID (categoría / búsqueda activa) — fondo blanco + FilterDrawer
// ─────────────────────────────────────────────────────────────────────────────

function GridView({
  items, categories, activeCat, params, total, page, totalPages,
}: {
  items: Product[]
  categories: CategorySlim[]
  activeCat: CategorySlim | undefined
  params: Record<string, string | undefined>
  total: number
  page: number
  totalPages: number
}) {
  const url = (overrides: Record<string, string | undefined>) =>
    buildUrl(params, overrides)

  // Chips de filtros activos (para mostrar bajo el toolbar)
  const activeChips: { label: string; removeUrl: string }[] = []
  if (params.category && activeCat) {
    activeChips.push({ label: activeCat.name, removeUrl: url({ category: undefined, page: undefined }) })
  }
  if (params.search) {
    activeChips.push({ label: `"${params.search}"`, removeUrl: url({ search: undefined, page: undefined }) })
  }
  if (params.inStock === 'true') {
    activeChips.push({ label: 'Solo en stock', removeUrl: url({ inStock: undefined, page: undefined }) })
  }
  if (params.minPrice || params.maxPrice) {
    const label = params.minPrice && params.maxPrice
      ? `$${Number(params.minPrice).toLocaleString('es-CO')} – $${Number(params.maxPrice).toLocaleString('es-CO')}`
      : params.minPrice
        ? `Desde $${Number(params.minPrice).toLocaleString('es-CO')}`
        : `Hasta $${Number(params.maxPrice).toLocaleString('es-CO')}`
    activeChips.push({ label, removeUrl: url({ minPrice: undefined, maxPrice: undefined, page: undefined }) })
  }

  return (
    // catalog-light fuerza las variables CSS al tema claro → tarjetas con fondo blanco
    <div className="catalog-light bg-white min-h-screen">

      {/* ── Breadcrumb + título ── */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-2 flex-wrap">
            <Link href="/" className="hover:text-gray-700 transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/catalogo" className="hover:text-gray-700 transition-colors">Catálogo</Link>
            {activeCat && <><span>/</span><span className="text-gray-600 font-medium">{activeCat.name}</span></>}
            {params.search && !activeCat && <><span>/</span><span className="text-gray-600 font-medium">Búsqueda</span></>}
          </nav>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">
            {activeCat
              ? <>{catIcon(activeCat.slug)} {activeCat.name}</>
              : params.search
                ? <>Resultados para &ldquo;{params.search}&rdquo;</>
                : 'Todo el catálogo'}
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Toolbar: filtros + conteo ── */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <FilterDrawer
              categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
              currentCategory={params.category}
              currentInStock={params.inStock}
              currentSearch={params.search}
              currentMinPrice={params.minPrice}
              currentMaxPrice={params.maxPrice}
            />

            {/* Chips de filtros activos */}
            {activeChips.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 flex-wrap">
                {activeChips.map((chip) => (
                  <Link
                    key={chip.label}
                    href={chip.removeUrl}
                    className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                  >
                    {chip.label}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Link>
                ))}
                <Link href="/catalogo" className="text-xs text-gray-400 hover:text-gray-700 underline transition-colors">
                  Limpiar todo
                </Link>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-400 shrink-0">
            {total} {total === 1 ? 'producto' : 'productos'}
          </p>
        </div>

        {/* Chips en móvil (bajo el toolbar) */}
        {activeChips.length > 0 && (
          <div className="sm:hidden flex flex-wrap gap-2 mb-5">
            {activeChips.map((chip) => (
              <Link
                key={chip.label}
                href={chip.removeUrl}
                className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full"
              >
                {chip.label}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Link>
            ))}
          </div>
        )}

        {/* ── Grid de productos ── */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Sin resultados</h2>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">No encontramos productos con esos filtros.</p>
            <Link href="/catalogo" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-500 transition-colors">
              Ver todo el catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-12 flex-wrap">
                {page > 1 && (
                  <Link href={url({ page: String(page - 1) })}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                    Anterior
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link key={p} href={url({ page: String(p) })}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors ${p === page ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300'}`}>
                    {p}
                  </Link>
                ))}
                {page < totalPages && (
                  <Link href={url({ page: String(page + 1) })}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors">
                    Siguiente
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
