/**
 * Sitemap de categorías — una URL por categoría con productos publicables.
 * `lastmod` = producto más recientemente modificado de la categoría.
 */
import { buildUrlSet, getCategoryEntries, SITEMAP_HEADERS } from '@/lib/sitemap'

export const revalidate = 3600

export async function GET() {
  return new Response(buildUrlSet(await getCategoryEntries()), { headers: SITEMAP_HEADERS })
}
