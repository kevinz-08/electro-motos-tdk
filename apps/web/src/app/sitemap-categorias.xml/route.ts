/**
 * Sitemap de categorías — una URL por categoría con productos publicables.
 * `lastmod` = producto más recientemente modificado de la categoría.
 */
import { buildUrlSet, getCategoryEntries, SITEMAP_HEADERS } from '@/lib/sitemap'

// Red de seguridad: los datos se invalidan por tag (lib/cache.ts, README §27).
export const revalidate = 86400

export async function GET() {
  return new Response(buildUrlSet(await getCategoryEntries()), { headers: SITEMAP_HEADERS })
}
