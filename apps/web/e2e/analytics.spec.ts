import { test, expect, type Page } from '@playwright/test'

/**
 * Embudo de GA4 (docs/seo/ Fase 4, ítem 11 — cierre A3):
 *   view_item → add_to_cart → view_cart → begin_checkout
 * (`purchase` sale en /checkout/confirmacion tras un pago real; no se simula aquí).
 *
 * Comprueba lo que el código encola en `window.dataLayer` con el consentimiento
 * aceptado. **Bloquea toda petición a Google** para que las pruebas nunca
 * ensucien la propiedad real de GA4 con visitas falsas.
 *
 * Si el entorno no tiene `NEXT_PUBLIC_GA_ID`, `track()` no encola nada y el
 * test se salta con un aviso en vez de fallar.
 */

const CONSENT_KEY = 'h2r-analytics-consent'
/** Claves que puede llevar un evento. Cualquier otra podría ser un dato personal. */
const ALLOWED_PARAM_KEYS = new Set(['currency', 'value', 'items', 'transaction_id', 'shipping', 'coupon', 'search_term', 'method', 'item_id', 'item_list_name', 'item_list_id'])
const ALLOWED_ITEM_KEYS = new Set(['item_id', 'item_name', 'price', 'quantity'])

type GaEvent = { name: string; params: Record<string, unknown> }

async function gaEvents(page: Page): Promise<GaEvent[]> {
  return page.evaluate(() => {
    const layer = (window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []
    return Array.from(layer)
      .filter((entry) => entry && entry[0] === 'event')
      .map((entry) => ({ name: String(entry[1]), params: (entry[2] ?? {}) as Record<string, unknown> }))
  })
}

async function waitForEvent(page: Page, name: string, timeout = 8_000): Promise<GaEvent | null> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const found = (await gaEvents(page)).find((e) => e.name === name)
    if (found) return found
    await page.waitForTimeout(250)
  }
  return null
}

function expectNoPersonalData(event: GaEvent) {
  for (const key of Object.keys(event.params)) expect(ALLOWED_PARAM_KEYS, `${event.name}.${key}`).toContain(key)
  for (const item of (event.params.items as Record<string, unknown>[] | undefined) ?? []) {
    for (const key of Object.keys(item)) expect(ALLOWED_ITEM_KEYS, `${event.name}.items.${key}`).toContain(key)
  }
}

test.describe('Embudo de GA4', () => {
  test.beforeEach(async ({ page, context }) => {
    // Nunca enviar nada a Google desde una prueba.
    await context.route(/googletagmanager\.com|google-analytics\.com|analytics\.google\.com/, (route) => route.abort())
    await page.addInitScript((key) => window.localStorage.setItem(key, 'granted'), CONSENT_KEY)
  })

  test('view_item → add_to_cart → view_cart → begin_checkout, sin datos personales', async ({ page, request }) => {
    // Un producto real con stock, sacado del sitemap (no depende de un slug fijo).
    const sitemap = await (await request.get('/sitemap-productos.xml')).text()
    const paths = [...sitemap.matchAll(/<loc>[^<]*?(\/producto\/[^<]+)<\/loc>/g)].map((m) => m[1]!).slice(0, 15)
    let found = false
    for (const path of paths) {
      await page.goto(path)
      if (await page.getByRole('button', { name: /agregar al carrito/i }).first().isVisible()) {
        found = true
        break
      }
    }
    test.skip(!found, 'Ningún producto con stock entre los primeros del sitemap')

    const viewItem = await waitForEvent(page, 'view_item')
    test.skip(!viewItem, 'GA4 no está configurado en este entorno (sin NEXT_PUBLIC_GA_ID no se encola nada)')
    expect(viewItem!.params.currency).toBe('COP')
    expectNoPersonalData(viewItem!)

    await page.getByRole('button', { name: /agregar al carrito/i }).first().click()
    const addToCart = await waitForEvent(page, 'add_to_cart')
    expect(addToCart, 'add_to_cart').not.toBeNull()
    expect(addToCart!.params.value).toBeGreaterThan(0)
    expectNoPersonalData(addToCart!)

    await page.goto('/carrito')
    const viewCart = await waitForEvent(page, 'view_cart')
    expect(viewCart, 'view_cart').not.toBeNull()
    expectNoPersonalData(viewCart!)

    await page.goto('/checkout')
    const beginCheckout = await waitForEvent(page, 'begin_checkout')
    expect(beginCheckout, 'begin_checkout').not.toBeNull()
    expectNoPersonalData(beginCheckout!)
  })

  test('sin consentimiento no se encola ningún evento', async ({ page, request }) => {
    await page.addInitScript((key) => window.localStorage.setItem(key, 'denied'), CONSENT_KEY)
    const sitemap = await (await request.get('/sitemap-productos.xml')).text()
    const path = sitemap.match(/<loc>[^<]*?(\/producto\/[^<]+)<\/loc>/)?.[1]
    test.skip(!path, 'Sin productos en el sitemap')
    await page.goto(path!)
    await page.waitForTimeout(1_500)
    expect(await gaEvents(page)).toEqual([])
  })
})
