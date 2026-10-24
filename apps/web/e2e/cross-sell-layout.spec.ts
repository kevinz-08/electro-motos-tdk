import { test, expect } from '@playwright/test'

/**
 * Venta cruzada de la ficha en escritorio: el botón "Agregar" debe quedar dentro
 * de su tarjeta. Antes la lista pasaba a 2 columnas por el ancho de la pantalla y,
 * en la columna derecha de la ficha, cada tarjeta medía ~190 px: el botón se salía.
 */

const MAX_PRODUCTS_TO_TRY = 25

for (const width of [1024, 1280, 1440]) {
  test(`venta cruzada a ${width} px — "Agregar" dentro de la tarjeta`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })

    // Busca una ficha que tenga sugerencias de venta cruzada.
    await page.goto('/catalogo?showAll=true')
    const hrefs = [...new Set(
      await page.locator('a[href^="/producto/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? '')),
    )].slice(0, MAX_PRODUCTS_TO_TRY)

    const cards = page
      .locator('section[aria-label] li')
      .filter({ has: page.getByRole('button', { name: 'Agregar', exact: true }) })

    let found = false
    for (const href of hrefs) {
      await page.goto(href)
      await page.waitForLoadState('networkidle')
      if ((await cards.count()) > 0) { found = true; break }
    }
    test.skip(!found, `ninguno de los primeros ${MAX_PRODUCTS_TO_TRY} productos tiene venta cruzada`)

    const count = await cards.count()
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const button = card.getByRole('button', { name: 'Agregar', exact: true })
      const c = (await card.boundingBox())!
      const b = (await button.boundingBox())!
      expect(b.x, 'el botón empieza antes que la tarjeta').toBeGreaterThanOrEqual(c.x)
      expect(b.x + b.width, 'el botón se sale por la derecha de la tarjeta').toBeLessThanOrEqual(c.x + c.width + 0.5)
    }
  })
}
