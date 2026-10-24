/**
 * Sitemap de productos — todos los productos activos y no borrados,
 * con o sin stock. `lastmod` real desde `Product.updatedAt`.
 */
import { buildUrlSet, getProductEntries, SITEMAP_HEADERS } from '@/lib/sitemap'

// Red de seguridad: los datos se invalidan por tag (lib/cache.ts, README §27).
export const revalidate = 86400

export async function GET() {
  return new Response(buildUrlSet(await getProductEntries()), { headers: SITEMAP_HEADERS })
}
