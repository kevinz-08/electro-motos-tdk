/**
 * Sitemap de kits — solo kits visibles (activos, con disponibilidad).
 * docs/seo/plan-kits.md, Fase 4 ítem 8.
 */
import { buildUrlSet, getKitEntries, SITEMAP_HEADERS } from '@/lib/sitemap'

export const revalidate = 3600

export async function GET() {
  // Sin la tabla (migración aún no aplicada), un sitemap vacío en vez de un 500.
  let entries: Awaited<ReturnType<typeof getKitEntries>> = []
  try {
    entries = await getKitEntries()
  } catch (e) {
    console.error('[kits] no se pudo generar sitemap-kits.xml', e)
  }
  return new Response(buildUrlSet(entries), { headers: SITEMAP_HEADERS })
}
