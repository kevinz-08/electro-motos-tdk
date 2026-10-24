import { test, expect, devices, type Page } from '@playwright/test'

/**
 * Ninguna página pública puede ser más ancha que la pantalla del celular.
 *
 * Si algo desborda, Safari en iPhone aleja el zoom para que quepa todo y la web
 * se ve encogida a un lado. Pasó en /catalogo: el `sr-only` de PriceTag (absoluto)
 * escapaba del recorte del carrusel y la página medía 879 px en una pantalla de 390.
 */

// Se toman las medidas del iPhone 13 sin `defaultBrowserType` (no se puede cambiar
// de navegador dentro de un describe): basta con el viewport para medir el desborde.
const { viewport, deviceScaleFactor, isMobile, hasTouch, userAgent } = devices['iPhone 13']
test.use({ viewport, deviceScaleFactor, isMobile, hasTouch, userAgent })

async function expectNoHorizontalOverflow(page: Page) {
  // Da tiempo a que se hidraten los carruseles (sus botones aparecen en cliente).
  await page.waitForLoadState('networkidle')
  const { clientWidth, scrollWidth } = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(scrollWidth, `la página mide ${scrollWidth} px en una pantalla de ${clientWidth}`).toBeLessThanOrEqual(clientWidth)
}

test.describe('Sin desborde horizontal en móvil', () => {
  for (const path of ['/', '/catalogo', '/catalogo?showAll=true', '/por-que-comprar-en-h2r']) {
    test(path, async ({ page }) => {
      await page.goto(path)
      await expectNoHorizontalOverflow(page)
    })
  }

  test('ficha de producto', async ({ page }) => {
    await page.goto('/catalogo?showAll=true')
    const href = await page.locator('a[href^="/producto/"]').first().getAttribute('href')
    expect(href).toBeTruthy()
    await page.goto(href!)
    await expectNoHorizontalOverflow(page)
  })
})
