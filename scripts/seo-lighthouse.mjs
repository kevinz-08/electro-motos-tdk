#!/usr/bin/env node
/**
 * Presupuesto de rendimiento — Fase 1 del proyecto SEO (docs/seo/).
 *
 * Corre Lighthouse en móvil contra las tres plantillas que importan (home,
 * catálogo y una ficha de producto) y falla si alguna métrica se sale del
 * presupuesto. Sin esto, nada impide que vuelva a entrar al repositorio otro
 * asset de 30 MB como el vídeo del hero.
 *
 * Uso:
 *   pnpm seo:lighthouse                        # contra producción
 *   pnpm seo:lighthouse http://localhost:3000  # contra el entorno local
 *
 * Requiere Chrome instalado y descarga Lighthouse con npx la primera vez.
 * Los informes JSON completos quedan en .lighthouse/.
 *
 * Los presupuestos son las metas del brief en el percentil 75 de móvil
 * (LCP ≤ 2,5 s, CLS ≤ 0,1, TBT como aproximación de INP) más un techo de peso
 * por página. Son datos de laboratorio: sirven para detectar regresiones, no
 * para declarar que el campo está en verde.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const BASE = (process.argv[2] ?? 'https://www.tiendah2r.com').replace(/\/$/, '')
const OUT_DIR = '.lighthouse'

/** Una entrada por plantilla. `maxBytes` es el peso total transferido. */
const TARGETS = [
  { name: 'home', path: '/', maxBytes: 1_500_000 },
  { name: 'catalogo', path: '/catalogo', maxBytes: 2_500_000 },
  // Ficha de producto: se resuelve en tiempo de ejecución desde el sitemap,
  // así el script no depende de que un slug concreto siga existiendo.
  { name: 'producto', path: null, maxBytes: 1_500_000 },
]

const BUDGETS = {
  performance: { min: 0.8, label: 'Rendimiento' },
  seo: { min: 0.95, label: 'SEO' },
  'largest-contentful-paint': { max: 2500, label: 'LCP (ms)' },
  'cumulative-layout-shift': { max: 0.1, label: 'CLS' },
  'total-blocking-time': { max: 300, label: 'TBT (ms)' },
  'server-response-time': { max: 600, label: 'TTFB (ms)' },
}

async function firstProductPath() {
  try {
    const xml = await fetch(`${BASE}/sitemap-productos.xml`).then((r) => r.text())
    const match = xml.match(/<loc>([^<]*\/producto\/[^<]*)<\/loc>/)
    if (match) return new URL(match[1]).pathname
  } catch {
    /* sin red o sin sitemap: se avisa abajo */
  }
  return null
}

function runLighthouse(url, outFile) {
  execFileSync(
    'npx',
    [
      '--yes', 'lighthouse@12', url,
      '--only-categories=performance,seo,best-practices',
      '--form-factor=mobile',
      '--screenEmulation.mobile',
      '--throttling-method=simulate',
      '--output=json',
      `--output-path=${outFile}`,
      '--chrome-flags=--headless=new --no-sandbox',
      '--quiet',
    ],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  )
  return JSON.parse(readFileSync(outFile, 'utf8'))
}

function evaluate(name, report, maxBytes) {
  const failures = []
  const rows = []

  for (const [id, budget] of Object.entries(BUDGETS)) {
    const value = report.categories[id]?.score ?? report.audits[id]?.numericValue
    if (value === undefined || value === null) continue

    const isScore = budget.min !== undefined
    const ok = isScore ? value >= budget.min : value <= budget.max
    const shown = isScore ? Math.round(value * 100) : Math.round(value * 100) / 100

    rows.push(`    ${ok ? 'OK  ' : 'FALLA'} ${budget.label}: ${shown}`)
    if (!ok) failures.push(`${name} — ${budget.label} = ${shown}`)
  }

  const total = report.audits['resource-summary']?.details?.items?.find((i) => i.resourceType === 'total')
  if (total) {
    const ok = total.transferSize <= maxBytes
    const kb = Math.round(total.transferSize / 1024)
    rows.push(`    ${ok ? 'OK  ' : 'FALLA'} Peso total: ${kb} KB (máx ${Math.round(maxBytes / 1024)} KB)`)
    if (!ok) failures.push(`${name} — peso total ${kb} KB`)
  }

  console.log(`\n  ${name}`)
  console.log(rows.join('\n'))
  return failures
}

async function main() {
  rmSync(OUT_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })

  const productPath = await firstProductPath()
  const failures = []

  for (const target of TARGETS) {
    const path = target.path ?? productPath
    if (!path) {
      console.warn(`\n  ${target.name}: omitido (no se pudo resolver una URL de producto)`)
      continue
    }

    const url = `${BASE}${path}`
    console.log(`\n▶ Lighthouse móvil: ${url}`)
    const report = runLighthouse(url, join(OUT_DIR, `${target.name}.json`))
    failures.push(...evaluate(target.name, report, target.maxBytes))
  }

  if (failures.length > 0) {
    console.error(`\n✖ ${failures.length} presupuesto(s) incumplido(s):`)
    for (const f of failures) console.error(`   · ${f}`)
    console.error(`\nInformes completos en ${OUT_DIR}/`)
    process.exit(1)
  }

  console.log('\n✔ Todas las plantillas dentro del presupuesto.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
