/**
 * Datos y serialización de los sitemaps segmentados — Fase 1 (docs/seo/).
 *
 * Antes había un único `/sitemap.xml` con 128 URLs que mezclaba productos con
 * `/auth/login` y `/auth/register` (ambas `noindex`), dejaba fuera las páginas
 * legales y `/contacto`, y excluía los productos sin stock.
 *
 * Ahora `/sitemap.xml` es un ÍNDICE que apunta a tres sitemaps:
 *
 *   /sitemap-paginas.xml      home, catálogo, contacto y legales
 *   /sitemap-categorias.xml   una URL por categoría con productos
 *   /sitemap-productos.xml    una URL por producto activo
 *
 * Cuando existan los hubs de modelo (Fase 2) y las guías (Fase 5) se añaden
 * como segmentos nuevos sin tocar los existentes.
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
