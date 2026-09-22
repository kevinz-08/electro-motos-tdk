/**
 * Sitemap de hubs de modelo de moto y de sus páginas modelo × categoría.
 * Solo entran los modelos con compatibilidades verificadas — ver `lib/sitemap.ts`.
 */
import { buildUrlSet, getModelEntries, SITEMAP_HEADERS } from '@/lib/sitemap'

export const revalidate = 3600

export async function GET() {
  return new Response(buildUrlSet(await getModelEntries()), { headers: SITEMAP_HEADERS })
}
