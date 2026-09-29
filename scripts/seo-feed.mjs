#!/usr/bin/env node
/**
 * Validación del feed de Google Merchant Center — Fase 7 (docs/seo/ROADMAP.md).
 *
 * Descarga /feeds/google-merchant.xml y comprueba, ítem por ítem, lo que
 * Merchant Center exige para no rechazar productos: campos obligatorios,
 * formato de precio en COP, disponibilidad, título ≤ 150, imágenes https,
 * ids únicos, `brand` presente y `mpn` o `identifier_exists=no`. Además revisa
 * que el enlace de una muestra de productos responda 200 y que la imagen sea
 * descargable.
 *
 * No sustituye al validador de Merchant Center (el criterio de salida de la
 * fase), pero detecta antes los errores que harían rechazar el feed.
 *
 * Uso:
 *   pnpm seo:feed                        # contra producción
 *   pnpm seo:feed http://localhost:3000  # contra el entorno local
 */

const BASE = (process.argv[2] ?? 'https://www.tiendah2r.com').replace(/\/$/, '')
const REQUIRED = ['id', 'title', 'description', 'link', 'image_link', 'availability', 'price', 'condition', 'brand', 'google_product_category']
const SAMPLE_LINKS = 5

let failures = 0
let checks = 0
function check(description, condition, detail = '') {
  checks++
  if (condition) console.log(`  OK    ${description}`)
  else {
    failures++
    console.log(`  FALLA ${description}${detail ? ` — ${detail}` : ''}`)
  }
}

const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => {
    const fields = {}
    for (const [, name, value] of body.matchAll(/<g:([a-z_]+)>([\s\S]*?)<\/g:\1>/g)) {
      const v = unescape(value)
      if (fields[name] === undefined) fields[name] = v
      else fields[name] = [].concat(fields[name], v)
    }
    return fields
  })
}

async function main() {
  console.log(`\nFeed de Merchant Center en ${BASE}\n`)
  const res = await fetch(`${BASE}/feeds/google-merchant.xml`)
  const xml = await res.text()
  check('responde 200', res.status === 200, `status ${res.status}`)
  check('es XML', (res.headers.get('content-type') ?? '').includes('xml'))
  check('RSS 2.0 con el espacio de nombres g:', xml.includes('<rss version="2.0"') && xml.includes('xmlns:g="http://base.google.com/ns/1.0"'))
  check('lleva X-Robots-Tag: noindex', (res.headers.get('x-robots-tag') ?? '').includes('noindex'))

  const items = parseItems(xml)
  console.log(`\n${items.length} productos en el feed\n`)
  if (items.length === 0) {
    console.log('  AVISO el feed está vacío. Revisa /admin/merchant: lo habitual es que falte la marca (H-18).\n')
  }

  const problems = []
  const ids = new Set()
  for (const item of items) {
    const where = item.id ?? '(sin id)'
    for (const field of REQUIRED) if (!item[field]) problems.push(`${where}: falta ${field}`)
    if (item.id) {
      if (ids.has(item.id)) problems.push(`${where}: id repetido`)
      ids.add(item.id)
    }
    if (item.title && item.title.length > 150) problems.push(`${where}: título de ${item.title.length} caracteres (máx. 150)`)
    if (item.price && !/^\d+\.\d{2} COP$/.test(item.price)) problems.push(`${where}: precio "${item.price}" sin formato "123000.00 COP"`)
    if (item.sale_price && !/^\d+\.\d{2} COP$/.test(item.sale_price)) problems.push(`${where}: sale_price con formato inválido`)
    if (item.sale_price && item.price && parseFloat(item.sale_price) >= parseFloat(item.price)) problems.push(`${where}: sale_price no es menor que price`)
    if (item.availability && !['in_stock', 'out_of_stock', 'preorder', 'backorder'].includes(item.availability)) problems.push(`${where}: availability inválida`)
    if (item.condition && item.condition !== 'new') problems.push(`${where}: condition "${item.condition}"`)
    for (const url of [].concat(item.image_link ?? [], item.additional_image_link ?? [])) {
      if (!/^https:\/\//.test(url)) problems.push(`${where}: imagen sin https (${url})`)
    }
    if (item.link && !/^https:\/\/www\.tiendah2r\.com\/producto\//.test(item.link)) problems.push(`${where}: link fuera del dominio canónico (${item.link})`)
    if (!item.mpn && item.identifier_exists !== 'no') problems.push(`${where}: sin mpn ni identifier_exists=no`)
    if (item.brand && /^(gen[eé]rico|sin marca|n\/a|h2r)/i.test(item.brand)) problems.push(`${where}: marca no válida "${item.brand}"`)
    if (item.google_product_category && !/^\d+$/.test(item.google_product_category)) problems.push(`${where}: google_product_category no numérica`)
  }
  check('todos los ítems cumplen los campos y formatos', problems.length === 0, `${problems.length} problemas`)
  for (const p of problems.slice(0, 30)) console.log(`        ${p}`)
  if (problems.length > 30) console.log(`        … y ${problems.length - 30} más`)

  // Muestra: la ficha existe (en el entorno auditado) y la imagen se descarga.
  for (const item of items.slice(0, SAMPLE_LINKS)) {
    const path = new URL(item.link).pathname
    const page = await fetch(`${BASE}${path}`)
    check(`ficha ${path} responde 200`, page.status === 200, `status ${page.status}`)
    const img = await fetch(item.image_link, { method: 'GET' })
    check(`imagen de ${item.id} descargable (${img.headers.get('content-type')})`, img.ok && (img.headers.get('content-type') ?? '').startsWith('image/'))
  }

  console.log(`\n${checks - failures}/${checks} comprobaciones correctas\n`)
  process.exit(failures ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
