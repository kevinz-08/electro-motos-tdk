/**
 * Sitemap de hubs de modelo de moto y de sus páginas modelo × categoría.
 * Solo entran los modelos con compatibilidades verificadas — ver `lib/sitemap.ts`.
 */
import { buildUrlSet, getModelEntries, SITEMAP_HEADERS } from '@/lib/sitemap'

// Red de seguridad: los datos se invalidan por tag (lib/cache.ts, README §27).
export const revalidate = 86400

export async function GET() {
  return new Response(buildUrlSet(await getModelEntries()), { headers: SITEMAP_HEADERS })
}
