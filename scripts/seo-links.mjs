#!/usr/bin/env node
/**
 * Reporte de enlazado interno — Fase 5, ítem 8 (docs/seo/ROADMAP.md).
 *
 * Rastrea el sitio desde el home siguiendo los enlaces <a href> igual que un
 * buscador (anchura primero), y lo cruza con las URLs de los sitemaps:
 *
 *   - Profundidad en clics desde el home de cada URL del sitemap.
 *   - Páginas huérfanas: están en el sitemap pero ningún enlace interno llega.
 *   - Enlaces internos rotos (4xx/5xx).
 *
 * Regla del ROADMAP: **ninguna página comercial a más de 3 clics del home**.
 * Comerciales = producto, hub de modelo, kit y categoría del catálogo. Sale
 * con código 1 si alguna la incumple (o es huérfana) o si hay enlaces rotos;
 * las huérfanas no comerciales son solo aviso.
 *
 * Solo sigue lo que un buscador debería seguir: mismo host, sin rutas
 * privadas, y del catálogo solo `?category=` y `?page=` (los demás filtros son
 * `noindex` y multiplicarían el rastreo sin aportar nada).
 *
 * Uso:
 *   pnpm seo:links                        # contra producción
 *   pnpm seo:links http://localhost:3000  # contra el entorno local
 *
 * Deja el detalle en .seo/links-report.json.
 */
import { mkdir, writeFile } from 'node:fs/promises'

const BASE = (process.argv[2] ?? 'https://www.tiendah2r.com').replace(/\/$/, '')
const ORIGIN = new URL(BASE).origin
const MAX_PAGES = 3000
const CONCURRENCY = 4
const MAX_COMMERCIAL_DEPTH = 3

const PRIVATE_PREFIXES = ['/admin', '/api', '/auth', '/carrito', '/checkout', '/cuenta', '/pedidos', '/_next']
const ALLOWED_QUERY_KEYS = new Set(['category', 'page'])

const isCommercial = (path) =>
  /^\/producto\//.test(path) ||
  /^\/repuestos\/[^/]+\/[^/]+/.test(path) ||
  /^\/kits\/[^/]+/.test(path) ||
  /^\/catalogo\?category=/.test(path)

/**
 * Normaliza una URL a "ruta?query" relativa al sitio, o null si no se sigue.
 * Los enlaces absolutos al host canónico cuentan como internos aunque se
 * audite en localhost (los canonical y algunos enlaces son absolutos).
 */
function normalize(href, from) {
  let url
  try {
    url = new URL(href, from)
  } catch {
    return null
  }
  const canonicalHost = 'www.tiendah2r.com'
  if (url.origin !== ORIGIN && url.hostname !== canonicalHost) return null
  if (!/^https?:$/.test(url.protocol)) return null
  const path = url.pathname.replace(/\/+$/, '') || '/'
  if (PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return null
  if (/\.(xml|txt|png|jpe?g|webp|svg|ico|mp4|pdf|css|js)$/i.test(path)) return null

  const params = [...url.searchParams.entries()]
  if (params.some(([k]) => !ALLOWED_QUERY_KEYS.has(k))) return null
  if (params.length && path !== '/catalogo') return null
  // `?page=1` es la misma página que sin parámetro.
  const kept = params.filter(([k, v]) => !(k === 'page' && v === '1')).sort(([a], [b]) => a.localeCompare(b))
  const query = kept.length ? `?${new URLSearchParams(kept).toString()}` : ''
  return `${path}${query}`
}

const hrefsOf = (html) => [...html.matchAll(/<a\b[^>]*?\shref="([^"#][^"]*)"/gi)].map((m) => m[1].replace(/&amp;/g, '&'))

async function fetchText(path) {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: 'follow', headers: { 'user-agent': 'H2R-seo-links/1.0' } })
    const type = res.headers.get('content-type') ?? ''
    return { status: res.status, body: type.includes('text/html') || type.includes('xml') ? await res.text() : '' }
  } catch (e) {
    return { status: 0, body: '', error: String(e) }
  }
}

async function sitemapUrls() {
  const index = await fetchText('/sitemap.xml')
  const children = [...index.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
  const urls = new Set()
  for (const child of children) {
    const sm = await fetchText(child)
    for (const [, loc] of sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const n = normalize(loc.replace(/&amp;/g, '&'), BASE)
      if (n) urls.add(n)
    }
  }
  return urls
}

async function crawl() {
  const depth = new Map([['/', 0]])
  const inbound = new Map()
  const status = new Map()
  const brokenFrom = new Map()
  let frontier = ['/']

  while (frontier.length && depth.size < MAX_PAGES) {
    const next = []
    for (let i = 0; i < frontier.length; i += CONCURRENCY) {
      const batch = frontier.slice(i, i + CONCURRENCY)
      const pages = await Promise.all(batch.map(async (path) => ({ path, ...(await fetchText(path)) })))
      for (const page of pages) {
        status.set(page.path, page.status)
        if (page.status !== 200) continue
        const d = depth.get(page.path)
        for (const href of hrefsOf(page.body)) {
          const target = normalize(href, `${BASE}${page.path}`)
          if (!target || target === page.path) continue
          if (!inbound.has(target)) inbound.set(target, new Set())
          inbound.get(target).add(page.path)
          if (!depth.has(target) && depth.size < MAX_PAGES) {
            depth.set(target, d + 1)
            next.push(target)
          }
        }
      }
    }
    frontier = next
    process.stdout.write(`  nivel ${depth.get(frontier[0] ?? '/') ?? '-'} · ${depth.size} URLs descubiertas\r`)
  }
  for (const [path, code] of status) {
    if (code >= 400 || code === 0) brokenFrom.set(path, { status: code, from: [...(inbound.get(path) ?? [])].slice(0, 5) })
  }
  return { depth, inbound, status, brokenFrom }
}

async function main() {
  console.log(`\nEnlazado interno de ${BASE}\n`)
  const [sitemap, { depth, inbound, status, brokenFrom }] = await Promise.all([sitemapUrls(), crawl()])
  console.log('')

  const rows = [...sitemap].map((path) => ({
    path,
    commercial: isCommercial(path),
    depth: depth.get(path) ?? null,
    inbound: inbound.get(path)?.size ?? 0,
  }))

  const orphans = rows.filter((r) => r.depth === null)
  const deepCommercial = rows.filter((r) => r.commercial && r.depth !== null && r.depth > MAX_COMMERCIAL_DEPTH)
  const orphanCommercial = orphans.filter((r) => r.commercial)
  const histogram = {}
  for (const r of rows) histogram[r.depth ?? 'huérfana'] = (histogram[r.depth ?? 'huérfana'] ?? 0) + 1

  console.log(`URLs en sitemaps: ${sitemap.size} · URLs rastreadas: ${status.size}`)
  console.log('Profundidad (clics desde el home) de las URLs del sitemap:')
  for (const [k, v] of Object.entries(histogram)) console.log(`  ${String(k).padStart(9)}: ${v}`)

  const report = (title, list, max = 25) => {
    console.log(`\n${title}: ${list.length}`)
    for (const r of list.slice(0, max)) console.log(`  ${r.path}${r.depth !== null ? ` (${r.depth} clics)` : ''}`)
    if (list.length > max) console.log(`  … y ${list.length - max} más (ver .seo/links-report.json)`)
  }
  report(`Comerciales a más de ${MAX_COMMERCIAL_DEPTH} clics`, deepCommercial)
  report('Comerciales huérfanas (en el sitemap, sin enlaces internos)', orphanCommercial)
  report('Otras huérfanas (aviso)', orphans.filter((r) => !r.commercial))
  console.log(`\nEnlaces internos rotos: ${brokenFrom.size}`)
  for (const [path, info] of [...brokenFrom].slice(0, 25)) console.log(`  ${info.status} ${path} ← ${info.from.join(', ')}`)

  const weakest = rows.filter((r) => r.depth !== null).sort((a, b) => a.inbound - b.inbound).slice(0, 10)
  console.log('\nURLs del sitemap con menos enlaces entrantes:')
  for (const r of weakest) console.log(`  ${String(r.inbound).padStart(3)} ← ${r.path}`)

  await mkdir('.seo', { recursive: true })
  await writeFile(
    '.seo/links-report.json',
    JSON.stringify(
      { base: BASE, generatedAt: new Date().toISOString(), histogram, deepCommercial, orphans, broken: Object.fromEntries(brokenFrom), rows },
      null,
      2,
    ),
  )

  const failed = deepCommercial.length + orphanCommercial.length + brokenFrom.size
  console.log(failed ? `\nFALLA: ${failed} problemas bloqueantes.\n` : '\nOK: todas las páginas comerciales a 3 clics o menos, sin rotos.\n')
  process.exit(failed ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
