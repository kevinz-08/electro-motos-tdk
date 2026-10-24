import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'

/**
 * Las tarjetas de producto de la tienda solo cambian con stock 0 ("Agotado") o
 * 1 ("Última unidad") — ver `ProductCard` en apps/web. Por encima de este valor
 * una venta solo cambia la ficha del propio producto.
 */
const CARD_STOCK_THRESHOLD = 1

/** Mismos valores que `CACHE_TAGS` / `productTag()` de apps/web/src/lib/cache-tags.ts. */
const PRODUCTS_TAG = 'products'
const productTag = (slug: string) => `product:${slug}`

/**
 * Invalida la caché de la tienda (Next.js) cuando el stock cambia fuera del admin:
 * pago aprobado, pedido contra entrega, reconciliación de Wompi o devolución.
 *
 * La tienda cachea sus lecturas sin TTL (README §27), así que sin este aviso la
 * ficha seguiría mostrando el stock anterior. Llama a `POST /api/internal/revalidate`
 * con `x-internal-secret`.
 *
 * Best-effort: nunca lanza. Un fallo solo se registra; el checkout valida el stock
 * real en el servidor, así que un dato viejo en pantalla no permite sobrevender.
 */
@Injectable()
export class StorefrontCacheService {
  private readonly logger = new Logger(StorefrontCacheService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Invalida la ficha de cada producto del pedido. Añade el tag global `products`
   * si alguno quedó con stock ≤ 1 (cambia su tarjeta en listados) o si `broad` es
   * true (reposición por devolución: el producto puede volver de "Agotado").
   */
  async revalidateOrderProducts(orderId: string, opts: { broad?: boolean } = {}): Promise<void> {
    try {
      const items = await this.prisma.client.orderItem.findMany({
        where: { orderId },
        select: { product: { select: { slug: true, stock: true } } },
      })
      if (items.length === 0) return

      const tags = [...new Set(items.map((i) => productTag(i.product.slug)))]
      if (opts.broad || items.some((i) => i.product.stock <= CARD_STOCK_THRESHOLD)) {
        tags.push(PRODUCTS_TAG)
      }
      await this.revalidateTags(tags)
    } catch (e) {
      this.logger.warn(`[StorefrontCache] No se pudo invalidar la caché del pedido ${orderId}: ${e}`)
    }
  }

  /** Invalida tags arbitrarios de la tienda. Nunca lanza. */
  async revalidateTags(tags: string[]): Promise<void> {
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3000'
    const secret = process.env['INTERNAL_API_SECRET']
    if (!secret) {
      this.logger.warn('[StorefrontCache] INTERNAL_API_SECRET no configurado — caché no invalidada')
      return
    }

    try {
      const res = await fetch(`${frontendUrl}/api/internal/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': secret },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) {
        this.logger.warn(`[StorefrontCache] Revalidación respondió ${res.status} tags=${tags.join(',')}`)
      }
    } catch (e) {
      this.logger.warn(`[StorefrontCache] Revalidación fallida tags=${tags.join(',')}: ${e}`)
    }
  }
}
