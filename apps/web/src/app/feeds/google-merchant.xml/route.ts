/**
 * Feed de productos para Google Merchant Center (docs/seo/, Fase 7).
 * URL a registrar en Merchant Center → Productos → Fuentes → "Obtención
 * programada": https://www.tiendah2r.com/feeds/google-merchant.xml
 *
 * Solo lleva lo que `buildMerchantFeed` aprueba (activos, con stock, imagen y
 * marca). Los excluidos y su motivo están en /admin/merchant.
 */
import { getCachedMerchantFeed, merchantFeedXml } from '@/lib/merchant-feed'

// Red de seguridad: los datos se invalidan por tag (lib/cache.ts, README §27).
export const revalidate = 86400

export async function GET() {
  const { items } = await getCachedMerchantFeed()
  return new Response(merchantFeedXml(items), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Es para Merchant Center, no para el índice de búsqueda.
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  })
}
