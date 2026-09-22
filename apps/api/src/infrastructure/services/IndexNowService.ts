import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'

/**
 * IndexNow — avisa a Bing, Yandex, Seznam y Naver cuando una URL cambia.
 *
 * Fase 1 del proyecto SEO (docs/seo/). Sin esto, un cambio de precio o de stock
 * tarda días en reflejarse en los buscadores; con IndexNow el aviso es
 * inmediato y gratuito. Google no participa en el protocolo: para Google el
 * canal sigue siendo el sitemap.
 *
 * Cómo funciona:
 *   1. Un archivo `<clave>.txt` en `apps/web/public/` cuyo contenido es la
 *      propia clave. Es como el buscador comprueba que quien avisa controla el
 *      dominio.
 *   2. Un POST a https://api.indexnow.org/indexnow con host, clave y hasta
 *      10.000 URLs.
 *
 * Por qué hay cola y no un POST por cambio:
 *   guardar 30 productos seguidos desde el panel dispararía 30 peticiones y
 *   IndexNow limita la frecuencia. Las URLs se acumulan en memoria y se envían
 *   en un solo lote pasados DEBOUNCE_MS sin cambios nuevos, o cuando el lote
 *   llega a MAX_BATCH.
 *
 * Es deliberadamente tolerante a fallos: si no hay clave configurada, o si la
 * API responde error, se registra y ya está. Un aviso perdido no puede tumbar
 * el guardado de un producto — el sitemap lo recoge igual.
 *
 * Configuración (apps/api/.env):
 *   INDEXNOW_KEY   clave de 8 a 128 caracteres hexadecimales. Sin ella el
 *                  servicio queda desactivado (no es un error).
 *   SITE_URL       host público de la tienda. Por defecto https://www.tiendah2r.com
 */

const ENDPOINT = 'https://api.indexnow.org/indexnow'
const DEBOUNCE_MS = 30_000
const MAX_BATCH = 100
const REQUEST_TIMEOUT_MS = 10_000

@Injectable()
export class IndexNowService implements OnModuleDestroy {
  private readonly logger = new Logger(IndexNowService.name)
  private readonly key = process.env['INDEXNOW_KEY'] ?? ''
  private readonly siteUrl = (process.env['SITE_URL'] ?? 'https://www.tiendah2r.com').replace(/\/$/, '')

  /** URLs pendientes de avisar. Set: el mismo producto guardado dos veces avisa una. */
  private readonly pending = new Set<string>()
  private timer?: NodeJS.Timeout

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer)
  }

  get enabled(): boolean {
    return this.key.length >= 8
  }

  /** Avisa del cambio de un producto por su slug. */
  notifyProduct(slug: string): void {
    this.notify(`${this.siteUrl}/producto/${slug}`)
  }

  /** Encola una URL absoluta. No lanza nunca: el aviso es best-effort. */
  notify(url: string): void {
    if (!this.enabled) return

    this.pending.add(url)

    if (this.pending.size >= MAX_BATCH) {
      void this.flush()
      return
    }

    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      void this.flush()
    }, DEBOUNCE_MS)
    // No mantiene vivo el proceso si es lo único pendiente.
    this.timer.unref?.()
  }

  /** Envía el lote acumulado. Vacía la cola antes de la petición para no duplicar. */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    if (!this.enabled || this.pending.size === 0) return

    const urlList = [...this.pending]
    this.pending.clear()

    const host = new URL(this.siteUrl).host

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host,
          key: this.key,
          keyLocation: `${this.siteUrl}/${this.key}.txt`,
          urlList,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (response.ok || response.status === 202) {
        this.logger.log(`[IndexNow] ${urlList.length} URL(s) notificadas (HTTP ${response.status})`)
      } else {
        // 403 = clave no encontrada o no válida; 422 = URLs que no son del host.
        this.logger.warn(
          `[IndexNow] Respuesta ${response.status} al notificar ${urlList.length} URL(s)`,
        )
      }
    } catch (error) {
      this.logger.warn(`[IndexNow] Error al notificar: ${String(error)}`)
    }
  }
}
