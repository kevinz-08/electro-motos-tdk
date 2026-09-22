/**
 * Sitemap de productos — todos los productos activos y no borrados,
 * con o sin stock. `lastmod` real desde `Product.updatedAt`.
 */
import { buildUrlSet, getProductEntries, SITEMAP_HEADERS } from '@/lib/sitemap'

export const revalidate = 3600

export async function GET() {
  return new Response(buildUrlSet(await getProductEntries()), { headers: SITEMAP_HEADERS })
}
