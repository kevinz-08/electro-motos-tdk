/**
 * Datos y serialización de los sitemaps segmentados — Fase 1 (docs/seo/).
 *
 * Antes había un único `/sitemap.xml` con 128 URLs que mezclaba productos con
 * `/auth/login` y `/auth/register` (ambas `noindex`), dejaba fuera las páginas
 * legales y `/contacto`, y excluía los productos sin stock.
 *
 * Ahora `/sitemap.xml` es un ÍNDICE que apunta a tres sitemaps:
 *
 *   /sitemap-paginas.xml      home, catálogo, contacto, sobre nosotros, garantías y legales
 *   /sitemap-categorias.xml   una URL por categoría con productos
 *   /sitemap-productos.xml    una URL por producto activo
 *   /sitemap-modelos.xml      hubs de modelo y sus categorías (Fase 2)
 *   /sitemap-kits.xml         kits visibles (Fase 4 ítem 8)
 *
 * Cuando existan las guías (Fase 5) se añaden como un segmento nuevo sin tocar
 * los existentes.
 *
 * Reglas aplicadas:
 *   - Solo entran URLs indexables. Nada que lleve `noindex`.
 *   - `lastmod` siempre real, tomado de `updatedAt` en la base de datos. Las
 *     páginas estáticas no llevan `lastmod`: no hay un dato honesto que poner.
 *   - Los productos sin stock SÍ entran: la URL existe, responde 200 y su
 *     JSON-LD declara `OutOfStock`. Sacarlos del sitemap solo les quitaba
 *     señales.
 *   - Los productos borrados (`deletedAt`) e inactivos NO entran.
 *   - Las categorías sin productos NO entran.
 */
import { prisma } from '@h2r/database'
import { absoluteUrl } from '@/lib/seo'
import { getCachedModelHub, getCachedPublishableModels, getCachedAllVisibleKits } from '@/lib/cache'

export interface SitemapEntry {
  url: string
  lastModified?: Date
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

// ── Segmentos ────────────────────────────────────────────────────────────────

/** Páginas fijas indexables. Las rutas `noindex` (auth, carrito, checkout) no están. */
export function getStaticEntries(): SitemapEntry[] {
  return [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1.0 },
    { url: absoluteUrl('/catalogo'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/contacto'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/sobre-nosotros'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/garantias'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/legal/terminos-y-condiciones'), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/legal/politica-de-envios'), changeFrequency: 'yearly', priority: 0.4 },
    { url: absoluteUrl('/legal/politica-de-cambios'), changeFrequency: 'yearly', priority: 0.4 },
    { url: absoluteUrl('/legal/politica-de-privacidad'), changeFrequency: 'yearly', priority: 0.3 },
  ]
}

/**
 * Una entrada por categoría que tenga al menos un producto publicable.
 *
 * Hoy la categoría vive en un query param (`/catalogo?category=<slug>`); es la
 * única URL de categoría que existe. En la Fase 2 pasa a ruta propia con 301 y
 * aquí solo cambia la forma de la URL.
 *
 * `lastModified` = el producto modificado más recientemente en esa categoría.
 */
export async function getCategoryEntries(): Promise<SitemapEntry[]> {
  const categories = await prisma.category.findMany({
    select: { slug: true, id: true },
  })

  const grouped = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { isActive: true, deletedAt: null },
    _count: { _all: true },
    _max: { updatedAt: true },
  })

  const statsByCategory = new Map(
    grouped.map((g) => [g.categoryId, { count: g._count._all, lastMod: g._max.updatedAt }]),
  )

  return categories
    .map((c) => ({ slug: c.slug, stats: statsByCategory.get(c.id) }))
    .filter((c): c is { slug: string; stats: { count: number; lastMod: Date | null } } =>
      Boolean(c.stats && c.stats.count > 0),
    )
    .map((c) => ({
      url: absoluteUrl(`/catalogo?category=${c.slug}`),
      ...(c.stats.lastMod ? { lastModified: c.stats.lastMod } : {}),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))
}

/** Una entrada por producto activo, con o sin stock. */
export async function getProductEntries(): Promise<SitemapEntry[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true, deletedAt: null },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })

  return products.map((p) => ({
    url: absoluteUrl(`/producto/${p.slug}`),
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))
}

// ── Serialización ────────────────────────────────────────────────────────────

/** `&`, `<` y `"` rompen el XML: las URLs de categoría llevan query string. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const toW3C = (date: Date) => date.toISOString()

/**
 * Kits visibles (docs/seo/plan-kits.md). Un kit sin disponibilidad no entra —
 * misma regla que los hubs de modelo: lo que no se publica, no se anuncia.
 */
export async function getKitEntries(): Promise<SitemapEntry[]> {
  const kits = await getCachedAllVisibleKits()
  return kits.map((k) => ({
    url: absoluteUrl(`/kits/${k.slug}`),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))
}

export function buildUrlSet(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) => {
      const parts = [`    <loc>${escapeXml(e.url)}</loc>`]
      if (e.lastModified) parts.push(`    <lastmod>${toW3C(e.lastModified)}</lastmod>`)
      if (e.changeFrequency) parts.push(`    <changefreq>${e.changeFrequency}</changefreq>`)
      if (e.priority !== undefined) parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`)
      return `  <url>\n${parts.join('\n')}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export function buildSitemapIndex(sitemaps: { url: string; lastModified?: Date }[]): string {
  const body = sitemaps
    .map((s) => {
      const parts = [`    <loc>${escapeXml(s.url)}</loc>`]
      if (s.lastModified) parts.push(`    <lastmod>${toW3C(s.lastModified)}</lastmod>`)
      return `  <sitemap>\n${parts.join('\n')}\n  </sitemap>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`
}

/** Cabeceras comunes: XML + caché de 1 h en el CDN con revalidación en segundo plano. */
export const SITEMAP_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
} as const

/**
 * Hubs de modelo y sus páginas de modelo × categoría (docs/seo/, Fase 2).
 *
 * Solo entran los modelos que tienen al menos un producto vendible con
 * compatibilidad **verificada**, y dentro de cada uno, solo las categorías con
 * productos. Es la misma regla que aplica el 404 de esas rutas: lo que no se
 * publica, no se anuncia.
 *
 * Mientras no haya compatibilidades cargadas, este sitemap sale vacío. Es lo
 * correcto: no hay nada publicable que ofrecer a los buscadores.
 */
export async function getModelEntries(): Promise<SitemapEntry[]> {
  const models = await getCachedPublishableModels()
  const entries: SitemapEntry[] = []

  for (const model of models) {
    const path = `/repuestos/${model.brand.slug}/${model.slug}`
    entries.push({
      url: absoluteUrl(path),
      changeFrequency: 'weekly',
      priority: 0.8,
    })

    const hub = await getCachedModelHub(model.brand.slug, model.slug)
    if (!hub.ok) continue

    for (const category of hub.value.categories) {
      if (category.productCount === 0) continue
      entries.push({
        url: absoluteUrl(`${path}/${category.categorySlug}`),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
  }

  return entries
}
