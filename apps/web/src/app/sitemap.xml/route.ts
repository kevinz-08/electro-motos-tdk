/**
 * Índice de sitemaps — `/sitemap.xml`.
 *
 * Es la URL que ya está enviada a los buscadores, así que se conserva: cambia
 * de contenido (antes una lista de 128 URLs, ahora un índice) pero no de
 * dirección. Apunta a los tres segmentos de `lib/sitemap.ts`.
 *
 * Es un Route Handler y no el `app/sitemap.ts` de Next porque la convención de
 * Next genera un `<urlset>`, no un `<sitemapindex>`.
 */
import { buildSitemapIndex, SITEMAP_HEADERS } from '@/lib/sitemap'
import { absoluteUrl } from '@/lib/seo'

// Red de seguridad: los datos se invalidan por tag (lib/cache.ts, README §27).
export const revalidate = 86400

export function GET() {
  const body = buildSitemapIndex([
    { url: absoluteUrl('/sitemap-paginas.xml') },
    { url: absoluteUrl('/sitemap-categorias.xml') },
    { url: absoluteUrl('/sitemap-productos.xml') },
    { url: absoluteUrl('/sitemap-modelos.xml') },
    { url: absoluteUrl('/sitemap-kits.xml') },
    { url: absoluteUrl('/sitemap-guias.xml') },
  ])

  return new Response(body, { headers: SITEMAP_HEADERS })
}
