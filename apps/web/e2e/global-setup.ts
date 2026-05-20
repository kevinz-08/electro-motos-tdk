import { chromium } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const AUTH_FILE = path.join(__dirname, '../playwright/.auth/user.json')

export default async function globalSetup() {
  // Si ya existe el estado de sesión y no estamos en CI, lo reutilizamos
  if (!process.env.CI && fs.existsSync(AUTH_FILE)) return

  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  if (!email || !password) {
    console.warn(
      '[E2E] TEST_USER_EMAIL / TEST_USER_PASSWORD no definidos — ' +
        'los tests de checkout se saltarán.',
    )
    // Crea un archivo vacío para que Playwright no falle al buscar el storageState
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/auth/login')

  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')

  // Espera a que el login complete y redirija
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), {
    timeout: 15_000,
  })

  await page.context().storageState({ path: AUTH_FILE })
  await browser.close()
}
