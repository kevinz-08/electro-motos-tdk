#!/usr/bin/env node
/**
 * Validación de datos estructurados — Fase 3 del proyecto SEO (docs/seo/).
 *
 * Recorre una muestra de URLs del sitio, extrae todo el JSON-LD y comprueba tres
 * cosas por cada bloque:
 *
 *   1. Que sea **parseable**. Un JSON roto no lo lee nadie, y desde fuera no se
 *      nota: la página se ve igual.
 *   2. Que el tipo esperado **esté presente** en la plantilla que le toca.
 *   3. Que traiga sus **campos obligatorios**, incluidos los anidados
 *      (`offers.price`, `offers.availability`…).
 *
 * Lo que NO hace: inventar reglas de Google. Se limita a lo que el proyecto
 * decidió marcar. Los campos que dependen de datos que el negocio todavía no ha
 * entregado (envío, devoluciones, marca y MPN del repuesto) son opcionales aquí
 * a propósito: si algún día llegan, el propio script lo reporta como presente.
 *
 * Uso:
 *   pnpm seo:schema                        # contra producción
 *   pnpm seo:schema http://localhost:3000  # contra el entorno local
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

function info(description) {
  console.log(`  ·     ${description}`)
}

/** Extrae y parsea todos los bloques JSON-LD de un HTML. */
function extractJsonLd(html) {
  const blocks = []
  const errors = []
  const regex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g

  let match
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      // Un bloque puede traer un nodo o un array de nodos: ambos son válidos.
      blocks.push(...(Array.isArray(parsed) ? parsed : [parsed]))
    } catch (error) {
      errors.push(String(error))
    }
  }

  return { blocks, errors }
}

/** Busca un valor anidado por ruta ("offers.price"). */
function valueAt(node, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), node)
}

function findByType(blocks, type) {
  return blocks.find((b) => {
    const t = b['@type']
    return Array.isArray(t) ? t.includes(type) : t === type
  })
}

/**
 * Comprueba una plantilla.
 *
 * @param required  tipos que deben estar, con sus campos obligatorios
 * @param optional  tipos que pueden faltar; si están, se informa de ello
 */
async function checkPage(label, path, required, optional = []) {
  console.log(`\n${label}  (${path})`)

  const response = await fetch(`${BASE}${path}`)
  if (response.status !== 200) {
    check(`${label} responde 200`, false, `status ${response.status}`)
    return
  }

  const html = await response.text()
  const { blocks, errors } = extractJsonLd(html)

  check('todo el JSON-LD es parseable', errors.length === 0, errors[0])
  check('la página tiene JSON-LD', blocks.length > 0, `${blocks.length} bloques`)

  for (const [type, fields] of Object.entries(required)) {
    const node = findByType(blocks, type)
    check(`${type} presente`, Boolean(node))
    if (!node) continue

    for (const field of fields) {
      const value = valueAt(node, field)
      const present = value !== undefined && value !== null && value !== ''
      check(`${type}.${field}`, present)
    }
  }

  for (const type of optional) {
    const node = findByType(blocks, type)
    info(`${type}: ${node ? 'presente' : 'ausente (opcional)'}`)
  }
}

async function firstUrlOf(sitemap, pattern) {
  try {
    const xml = await fetch(`${BASE}/${sitemap}`).then((r) => r.text())
    const match = xml.match(new RegExp(`<loc>([^<]*${pattern}[^<]*)</loc>`))
    return match ? new URL(match[1]).pathname + new URL(match[1]).search : null
  } catch {
    return null
  }
}

async function main() {
  console.log(`\nValidando datos estructurados en ${BASE}`)

  // ── Home: identidad del negocio, buscador y FAQ ────────────────────────────
  await checkPage('Home', '/', {
    Organization: [
      'name',
      'legalName',
      'taxID',
      'url',
      'logo',
      'address.addressLocality',
      'address.addressCountry',
      'contactPoint.areaServed',
      'sameAs',
    ],
    WebSite: ['url', 'name', 'potentialAction.target.urlTemplate'],
    FAQPage: ['mainEntity'],
  })

  // ── Ficha de producto ──────────────────────────────────────────────────────
  const productPath = await firstUrlOf('sitemap-productos.xml', '/producto/')
  if (productPath) {
    await checkPage(
      'Producto',
      productPath,
      {
        Product: [
          'name',
          'sku',
          'image',
          'description',
          'url',
          'offers.price',
          'offers.priceCurrency',
          'offers.availability',
          'offers.itemCondition',
          'offers.url',
          'offers.hasMerchantReturnPolicy.merchantReturnDays',
          'offers.shippingDetails.shippingDestination',
        ],
        BreadcrumbList: ['itemListElement'],
      },
      // Dependen de datos del negocio (H-18) y de que el producto tenga
      // compatibilidades verificadas cargadas (H-02).
      ['AggregateRating'],
    )
  } else {
    check('se pudo resolver una ficha de producto desde el sitemap', false)
  }

  // ── Categoría del catálogo ─────────────────────────────────────────────────
  const categoryPath = await firstUrlOf('sitemap-categorias.xml', 'category=')
  if (categoryPath) {
    await checkPage('Categoría', categoryPath, {
      ItemList: ['name', 'numberOfItems', 'itemListElement'],
      BreadcrumbList: ['itemListElement'],
    })
  }

  // ── Hub de modelo: solo si ya hay compatibilidades cargadas ────────────────
  const modelPath = await firstUrlOf('sitemap-modelos.xml', '/repuestos/')
  if (modelPath) {
    await checkPage('Hub de modelo', modelPath, {
      BreadcrumbList: ['itemListElement'],
    })
  } else {
    console.log('\nHub de modelo')
    info('omitido: todavía no hay compatibilidades verificadas cargadas (H-02)')
  }

  console.log(`\n${failures === 0 ? '✔' : '✖'} ${checks - failures}/${checks} comprobaciones correctas`)
  if (failures > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
