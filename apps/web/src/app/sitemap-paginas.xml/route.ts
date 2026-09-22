/**
 * Sitemap de páginas fijas — home, catálogo, contacto y legales.
 * Ver `lib/sitemap.ts` para el criterio de qué entra y qué no.
 */
import { buildUrlSet, getStaticEntries, SITEMAP_HEADERS } from '@/lib/sitemap'

export const revalidate = 86400

export function GET() {
  return new Response(buildUrlSet(getStaticEntries()), { headers: SITEMAP_HEADERS })
}
