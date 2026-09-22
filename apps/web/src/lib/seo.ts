/**
 * Utilidades de SEO técnico — Fase 1 del proyecto SEO (docs/seo/).
 *
 * Centraliza tres cosas que antes no existían en el proyecto:
 *
 *   1. LA URL CANÓNICA DEL SITIO.
 *      `tiendah2r.com` redirige 308 a `www.tiendah2r.com`, así que el host con
 *      `www` es el canónico. Todas las URLs que salen de aquí son absolutas y
 *      sin barra final, para que nunca convivan dos variantes de la misma
 *      página (/catalogo y /catalogo/).
 *
 *   2. `alternates` (canonical + hreflang) por página.
 *      La tienda es monolingüe en español de Colombia: se declara `es-CO` y
 *      `x-default` apuntando a la misma URL. No hay versiones por idioma.
 *
 *   3. LAS REGLAS DE INDEXACIÓN DE LOS FILTROS DEL CATÁLOGO.
 *      El catálogo es una sola ruta (`/catalogo`) con siete parámetros. Sin
 *      reglas, cada combinación es una URL indexable distinta con el mismo
 *      contenido — y `?search=` acepta texto libre, o sea espacio de rastreo
 *      infinito. `catalogSeo()` decide qué se indexa y qué no.
 *
 * Regla de indexación del catálogo (Fase 1):
 *   - `/catalogo`                        → indexable
 *   - `/catalogo?category=<slug>`        → indexable (única faceta que se indexa)
 *   - `?category=<slug>&page=N`          → indexable, canonical a sí misma
 *   - `?search=`, `?minPrice=`, `?maxPrice=`, `?inStock=`, `?showAll=`
 *                                        → `noindex, follow`
 *   - cualquier combinación de más de una faceta → `noindex, follow`
 *   - listado sin resultados             → `noindex, follow`
 *
 * "follow" siempre: aunque la página no se indexe, sus enlaces a producto sí
 * deben transmitir señales.
 */
import type { Metadata } from 'next'

/** Host canónico. En producción: https://www.tiendah2r.com */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.tiendah2r.com'
).replace(/\/$/, '')

export const SITE_NAME = 'H2R Online Store'

/** Convierte una ruta relativa en URL absoluta canónica. */
export function absoluteUrl(path = '/'): string {
  if (path.startsWith('http')) return path
  const clean = path.startsWith('/') ? path : `/${path}`
  // Nunca barra final: la home es SITE_URL a secas, igual que el canonical que
  // emite Next. Así el sitemap y el <link rel="canonical"> dicen lo mismo.
  const normalized = clean === '/' ? '' : clean.replace(/\/(?=$|\?)/, '')
  return `${SITE_URL}${normalized}`
}

/**
 * `alternates` de Next: canonical absoluto + hreflang.
 * Se pasa a `Metadata.alternates` en cada plantilla.
 */
export function canonical(path = '/'): NonNullable<Metadata['alternates']> {
  const url = absoluteUrl(path)
  return {
    canonical: url,
    languages: {
      'es-CO': url,
      'x-default': url,
    },
  }
}

/** `noindex, follow`: la página no entra al índice pero sus enlaces sí cuentan. */
export const NOINDEX_FOLLOW: NonNullable<Metadata['robots']> = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
}

/** Parámetros del catálogo que NUNCA generan una URL indexable. */
const NON_INDEXABLE_PARAMS = ['search', 'minPrice', 'maxPrice', 'inStock', 'showAll'] as const

export interface CatalogParams {
  category?: string
  search?: string
  page?: string
  inStock?: string
  minPrice?: string
  maxPrice?: string
  showAll?: string
}

/**
 * Decide canonical y robots para una vista del catálogo.
 *
 * @param params    searchParams ya resueltos
 * @param hasResults `false` cuando el listado no devuelve productos — un listado
 *                   vacío nunca se indexa.
 */
export function catalogSeo(
  params: CatalogParams,
  hasResults = true,
): Pick<Metadata, 'alternates' | 'robots'> {
  const activeFilters = NON_INDEXABLE_PARAMS.filter((k) => {
    const v = params[k]
    return v !== undefined && v !== ''
  })

  const page = Number(params.page ?? 1)
  const pageSuffix = Number.isFinite(page) && page > 1 ? `&page=${page}` : ''

  // Única faceta indexable: la categoría (sola, con o sin paginación).
  if (params.category && activeFilters.length === 0 && hasResults) {
    return {
      alternates: canonical(`/catalogo?category=${params.category}${pageSuffix}`),
      robots: { index: true, follow: true },
    }
  }

  // Catálogo raíz, sin ningún filtro.
  if (!params.category && activeFilters.length === 0 && !pageSuffix) {
    return { alternates: canonical('/catalogo'), robots: { index: true, follow: true } }
  }

  // Todo lo demás: búsquedas, filtros de precio/stock y combinaciones.
  // El canonical apunta a la versión limpia de la que deriva esa vista.
  const cleanPath = params.category ? `/catalogo?category=${params.category}` : '/catalogo'
  return { alternates: canonical(cleanPath), robots: NOINDEX_FOLLOW }
}
