#!/usr/bin/env node
/**
 * Verificación de la base técnica de SEO — Fase 1 (docs/seo/).
 *
 * Comprueba contra un sitio en marcha lo que la Fase 1 dejó implementado:
 * robots.txt, los cuatro sitemaps, los canonical, el idioma, las reglas de
 * indexación de los filtros del catálogo y el acceso de los crawlers de IA.
 *
 * Uso:
 *   pnpm seo:check                        # contra producción
 *   pnpm seo:check http://localhost:3000  # contra el entorno local
 *
 * Sale con código 1 si algo falla, así que sirve igual en local que en CI.
 */

const BASE = (process.argv[2] ?? 'https://www.tiendah2r.com').replace(/\/$/, '')

let failures = 0
let checks = 0

function check(description, condition, detail = '') {
  checks++
  if (condition) {
    console.log(`  OK    ${description}`)
  } else {
    failures++
    console.log(`  FALLA ${description}${detail ? ` — ${detail}` : ''}`)
  }
}

const get = async (path, headers = {}) => {
  const response = await fetch(`${BASE}${path}`, { headers, redirect: 'follow' })
  return { status: response.status, body: await response.text() }
}

const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] ?? null
const robotsMetaOf = (html) => html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? null

/**
 * Los canonical son absolutos y apuntan SIEMPRE al host canónico
 * (NEXT_PUBLIC_SITE_URL), también cuando se audita en localhost. Por eso se
 * comparan la ruta y el query string, no la URL completa, y aparte se
 * comprueba que el host canónico sea uno solo y por https.
 */
function canonicalPath(html) {
  const raw = canonicalOf(html)
  if (!raw) return null
  const url = new URL(raw)
  return `${url.pathname}${url.search}`
}

async function main() {
  console.log(`\nVerificando ${BASE}\n`)

  // ── robots.txt ─────────────────────────────────────────────────────────────
  console.log('robots.txt')
  const robots = await get('/robots.txt')
  check('responde 200', robots.status === 200, `status ${robots.status}`)
  check('declara el índice de sitemaps', robots.body.includes('/sitemap.xml'))
  check('bloquea el checkout', /Disallow:\s*\/checkout/i.test(robots.body))
  check('bloquea el panel admin', /Disallow:\s*\/admin/i.test(robots.body))
  check('bloquea la búsqueda interna', /Disallow:.*search=/i.test(robots.body))
  for (const bot of ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']) {
    check(`permite ${bot}`, robots.body.includes(bot))
  }

  // ── Sitemaps ───────────────────────────────────────────────────────────────
  console.log('\nSitemaps')
  const index = await get('/sitemap.xml')
  check('/sitemap.xml responde 200', index.status === 200, `status ${index.status}`)
  check('/sitemap.xml es un índice', index.body.includes('<sitemapindex'))

  for (const segment of ['paginas', 'categorias', 'productos']) {
    const sitemap = await get(`/sitemap-${segment}.xml`)
    const count = (sitemap.body.match(/<loc>/g) ?? []).length
    check(`/sitemap-${segment}.xml responde 200`, sitemap.status === 200, `status ${sitemap.status}`)
    check(`/sitemap-${segment}.xml tiene URLs`, count > 0, `${count} URLs`)
    check(`/sitemap-${segment}.xml no incluye rutas noindex`,
      !/\/auth\/|\/carrito|\/checkout|\/pedidos/.test(sitemap.body))
  }

  // ── Canonical, idioma y hreflang ───────────────────────────────────────────
  console.log('\nCanonical e idioma')
  const home = await get('/')
  const canonicalHost = canonicalOf(home.body) ? new URL(canonicalOf(home.body)).origin : null

  check('la home responde 200', home.status === 200, `status ${home.status}`)
  check('<html lang="es-CO">', home.body.includes('lang="es-CO"'))
  check('la home tiene canonical', canonicalPath(home.body) === '/', canonicalOf(home.body) ?? 'ninguno')
  check('el host canónico es https', canonicalHost?.startsWith('https://') ?? false, canonicalHost ?? 'ninguno')
  check('la home declara hreflang es-CO', /hreflang="es-CO"/i.test(home.body))
  check('la home declara x-default', /hreflang="x-default"/i.test(home.body))

  const catalogo = await get('/catalogo')
  check('el catálogo tiene canonical', canonicalPath(catalogo.body) === '/catalogo',
    canonicalOf(catalogo.body) ?? 'ninguno')
  check('el catálogo usa el mismo host canónico',
    canonicalOf(catalogo.body)?.startsWith(canonicalHost ?? '\0') ?? false,
    canonicalOf(catalogo.body) ?? 'ninguno')

  // ── Reglas de indexación del catálogo ──────────────────────────────────────
  console.log('\nIndexación de los filtros del catálogo')
  const categorySlug = (await get('/sitemap-categorias.xml')).body
    .match(/category=([a-z0-9-]+)/)?.[1]

  if (categorySlug) {
    const category = await get(`/catalogo?category=${categorySlug}`)
    check(`?category=${categorySlug} es indexable`,
      !/noindex/.test(robotsMetaOf(category.body) ?? ''), robotsMetaOf(category.body) ?? 'sin meta')
    check(`?category=${categorySlug} apunta a su propio canonical`,
      canonicalPath(category.body) === `/catalogo?category=${categorySlug}`,
      canonicalOf(category.body) ?? 'ninguno')
  }

  const search = await get('/catalogo?search=pastillas')
  check('?search= lleva noindex', /noindex/.test(robotsMetaOf(search.body) ?? ''),
    robotsMetaOf(search.body) ?? 'sin meta')
  check('?search= mantiene follow', /follow/.test(robotsMetaOf(search.body) ?? ''))

  const filtered = await get('/catalogo?minPrice=1000&maxPrice=900000')
  check('los filtros de precio llevan noindex', /noindex/.test(robotsMetaOf(filtered.body) ?? ''),
    robotsMetaOf(filtered.body) ?? 'sin meta')

  // ── Ficha de producto ──────────────────────────────────────────────────────
  console.log('\nFicha de producto')
  const productUrl = (await get('/sitemap-productos.xml')).body.match(/<loc>([^<]+)<\/loc>/)?.[1]
  if (productUrl) {
    const path = new URL(productUrl).pathname
    const product = await get(path)
    check('tiene canonical absoluto', canonicalPath(product.body) === path,
      canonicalOf(product.body) ?? 'ninguno')
    check('lleva JSON-LD de Product', product.body.includes('"@type":"Product"'))
    check('el precio está en el HTML inicial', /"priceCurrency":"COP"/.test(product.body))
  }

  // ── Crawlers de IA ─────────────────────────────────────────────────────────
  console.log('\nCrawlers de IA')
  const bots = ['GPTBot/1.1', 'OAI-SearchBot/1.0', 'PerplexityBot/1.0', 'ClaudeBot/1.0', 'Googlebot/2.1']
  for (const ua of bots) {
    const response = await fetch(`${BASE}/`, { headers: { 'User-Agent': ua } })
    check(`${ua} recibe 200`, response.status === 200, `status ${response.status}`)
  }

  // ── Resultado ──────────────────────────────────────────────────────────────
  console.log(`\n${failures === 0 ? '✔' : '✖'} ${checks - failures}/${checks} comprobaciones correctas`)
  if (failures > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
