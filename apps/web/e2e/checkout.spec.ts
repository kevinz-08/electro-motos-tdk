import { test, expect } from '@playwright/test'

/**
 * Tests de checkout — requieren sesión autenticada.
 * La sesión se crea en global-setup.ts usando TEST_USER_EMAIL / TEST_USER_PASSWORD.
 *
 * Las llamadas al API de NestJS se mockean con page.route() para que los tests
 * no dependan del servidor NestJS ni de Wompi.
 */

const MOCK_ORDER_RESPONSE = {
  order: {
    id: 'test-order-e2e',
    total: 8500000,
    status: 'PENDING',
    shippingAddress: {
      fullName: 'Test User',
      address: 'Calle 45 # 23-10',
      city: 'Medellín',
      department: 'Antioquia',
      phone: '3001234567',
    },
  },
  payment: {
    publicKey: 'pub_test_mock_key',
    integritySignature: 'mock-integrity-sig',
    reference: 'test-ref-e2e',
    amountInCents: 8500000,
    currency: 'COP',
  },
}

async function seedCart(page: import('@playwright/test').Page, userId: string) {
  const key = `electro-motos-cart-${userId}`
  await page.evaluate(
    ({ storageKey, cartData }) => localStorage.setItem(storageKey, cartData),
    {
      storageKey: key,
      cartData: JSON.stringify([
        {
          product: {
            id: 'test-prod-1',
            name: 'Pastilla de freno Brembo YZF-R3',
            slug: 'pastilla-freno-brembo-yzf-r3',
            price: 8500000,
            stock: 10,
            sku: 'BRE-001',
            images: [],
            description: 'Test product',
            isActive: true,
            categoryId: 'cat-1',
            compatible: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          quantity: 1,
        },
      ]),
    },
  )
}

test.describe('Checkout — flujo completo (autenticado)', () => {
  test.beforeEach(async ({ page }) => {
    // Intercepta las llamadas al API de NestJS
    await page.route('**/orders', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_ORDER_RESPONSE),
        })
      } else {
        await route.continue()
      }
    })
  })

  test('checkout — redirige a login si no hay sesión (sanity check)', async ({
    browser,
  }) => {
    // Usa un contexto limpio sin sesión
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('http://localhost:3000/checkout')
    await expect(page).toHaveURL(/\/auth\/login/)
    await ctx.close()
  })

  test('checkout — muestra el formulario de envío con sesión activa', async ({
    page,
  }) => {
    // Obtiene el userId de la sesión para construir la clave del carrito
    const session = await page.request.get('/api/auth/session')
    const sessionData = await session.json()
    const userId: string = sessionData?.user?.id ?? 'guest'

    await page.goto('/carrito')
    await seedCart(page, userId)

    await page.goto('/checkout')
    await expect(
      page.getByRole('heading', { name: /datos de envío/i }),
    ).toBeVisible({ timeout: 10_000 })

    // Verifica que los campos ARIA estén presentes (11.2)
    await expect(page.locator('#checkout-fullName')).toBeVisible()
    await expect(page.locator('#checkout-address')).toBeVisible()
    await expect(page.locator('#checkout-city')).toBeVisible()
    await expect(page.locator('#checkout-department')).toBeVisible()
    await expect(page.locator('#checkout-phone')).toBeVisible()
  })

  test('checkout — happy path: envío → avanza al paso de pago', async ({
    page,
  }) => {
    const session = await page.request.get('/api/auth/session')
    const sessionData = await session.json()
    const userId: string = sessionData?.user?.id ?? 'guest'

    await page.goto('/carrito')
    await seedCart(page, userId)

    await page.goto('/checkout')
    await expect(page.locator('#checkout-fullName')).toBeVisible({
      timeout: 10_000,
    })

    // Rellena el formulario de envío
    await page.fill('#checkout-fullName', 'Juan Pérez E2E')
    await page.fill('#checkout-address', 'Calle 45 # 23-10, Apto 302')
    await page.fill('#checkout-city', 'Medellín')
    await page.fill('#checkout-department', 'Antioquia')
    await page.fill('#checkout-phone', '3001234567')

    await page.getByRole('button', { name: /continuar al pago/i }).click()

    // Tras la respuesta mockeada del API, avanza al paso de pago
    await expect(
      page.getByRole('heading', { name: /pago seguro con wompi/i }),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('checkout — validación: no avanza si faltan campos requeridos', async ({
    page,
  }) => {
    const session = await page.request.get('/api/auth/session')
    const sessionData = await session.json()
    const userId: string = sessionData?.user?.id ?? 'guest'

    await page.goto('/carrito')
    await seedCart(page, userId)

    await page.goto('/checkout')
    await expect(page.locator('#checkout-fullName')).toBeVisible({
      timeout: 10_000,
    })

    // Intenta enviar sin rellenar nada
    await page.getByRole('button', { name: /continuar al pago/i }).click()

    // El navegador activa la validación HTML5 — el formulario no envía
    // y se mantiene en el paso de envío
    await expect(
      page.getByRole('heading', { name: /datos de envío/i }),
    ).toBeVisible()
  })
})
