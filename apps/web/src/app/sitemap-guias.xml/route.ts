/**
 * Sitemap de guías de mantenimiento y páginas de autor — solo lo publicable
 * (docs/seo/, Fase 5).
 */
import { buildUrlSet, getGuideEntries, SITEMAP_HEADERS } from '@/lib/sitemap'

export const revalidate = 3600

export async function GET() {
  // Sin las tablas de la Fase 5 (migración sin aplicar), un sitemap vacío en vez de un 500.
  let entries: Awaited<ReturnType<typeof getGuideEntries>> = []
  try {
    entries = await getGuideEntries()
  } catch (e) {
    console.error('[guias] no se pudo generar sitemap-guias.xml', e)
  }
  return new Response(buildUrlSet(entries), { headers: SITEMAP_HEADERS })
}
