/**
 * Crea 4 kits de ejemplo con productos que YA existen en el catálogo.
 *
 *   pnpm --filter @h2r/database seed:kits            → dry-run: muestra qué armaría, no escribe
 *   pnpm --filter @h2r/database seed:kits -- --apply → crea/actualiza los kits
 *
 * - Idempotente: upsert por `slug`; correrlo dos veces no duplica nada.
 * - Solo lee productos activos, no borrados y con stock; cada kit sale de buscar
 *   fragmentos del nombre del producto (el más barato en stock de cada grupo).
 * - Un kit solo se crea si encuentra al menos 2 grupos; el descuento es el % indicado
 *   sobre la suma, redondeado a miles de pesos y siempre menor que la suma.
 * - No sube imágenes: se agregan desde /admin/kits. Mientras tanto la tienda usa la
 *   foto del primer producto de cada kit.
 * - Precios en centavos COP (enteros).
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
const prisma = new PrismaClient({ adapter })

interface KitTemplate {
  slug: string
  name: string
  description: string
  /** % de descuento sobre la suma de los productos. */
  discountPercent: number
  /** Cada grupo aporta UN producto: el más barato en stock cuyo nombre contenga alguno de esos fragmentos. */
  groups: string[][]
}

const TEMPLATES: KitTemplate[] = [
  {
    slug: 'kit-afinacion-gixxer-pulsar',
    name: 'Kit de afinación Gixxer / Pulsar',
    description: 'Bujía Bosch y filtro de aire de alto flujo para recuperar la respuesta del motor.',
    discountPercent: 8,
    groups: [['BUJIA BOSCH PARA FZ-GIXXER-PULSAR'], ['FILTRO AIRE ALTO FLUJO GIXXER 150 Y 250']],
  },
  {
    slug: 'kit-cuidado-del-motor',
    name: 'Kit cuidado del motor',
    description: 'Aceite Liqui Moly 10W-40, aditivo antidesgaste y lubricante de cadena.',
    discountPercent: 8,
    groups: [['LIQUIMOLY 4T 10W-40 STREET 1L'], ['ADITIVO-AC LIQUIMOLY MOTO MOS2'], ['LUBRICANTE DE CADENA 240ML']],
  },
  {
    slug: 'kit-iluminacion-led',
    name: 'Kit de iluminación LED',
    description: 'Bombillo H4 LED, exploradora y direccionales LED para ver y ser visto.',
    discountPercent: 8,
    groups: [['BOMBILLO H4 LED 8000 LUMENS M4 PLUS'], ['EXPLORADORA LED RECTANGULO'], ['DIRECCIONALES LED NARANJA']],
  },
  {
    slug: 'kit-filtro-alto-flujo-xtz',
    name: 'Kit filtro de alto flujo XTZ 150',
    description: 'Filtro de aire de alto flujo para XTZ 150 con el kit de limpieza para mantenerlo en forma.',
    discountPercent: 8,
    groups: [['FILTRO AIRE ALTO FLUJO XTZ 150'], ['KIT DE LIMPIEZA FILTRO K&N']],
  },
]

async function pickProduct(words: string[], taken: Set<string>) {
  return prisma.product.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      stock: { gt: 0 },
      id: { notIn: [...taken] },
      OR: words.map((w) => ({ name: { contains: w, mode: 'insensitive' as const } })),
    },
    orderBy: { price: 'asc' },
    select: { id: true, name: true, price: true, stock: true },
  })
}

async function main() {
  const apply = process.argv.includes('--apply')
  console.log(apply ? '▶ MODO APPLY: se escribirán los kits' : '▶ DRY-RUN: no se escribe nada (usa --apply)')

  for (const t of TEMPLATES) {
    const taken = new Set<string>()
    const items: Array<{ productId: string; name: string; price: number }> = []
    for (const words of t.groups) {
      const p = await pickProduct(words, taken)
      if (p) {
        taken.add(p.id)
        items.push({ productId: p.id, name: p.name, price: p.price })
      }
    }

    if (items.length < 2) {
      console.log(`✗ ${t.name}: solo ${items.length} producto(s) con stock; se omite`)
      continue
    }

    const total = items.reduce((s, i) => s + i.price, 0)
    // Redondeo a miles de pesos (100.000 centavos); nunca >= suma.
    let discountCents = Math.floor((total * t.discountPercent) / 100 / 100_000) * 100_000
    if (discountCents >= total) discountCents = 0

    console.log(`✓ ${t.name}  (suma ${total / 100} COP, descuento ${discountCents / 100} COP)`)
    for (const i of items) console.log(`    - ${i.name} (${i.price / 100} COP)`)

    if (!apply) continue

    await prisma.$transaction(async (tx) => {
      const kit = await tx.kit.upsert({
        where: { slug: t.slug },
        update: { name: t.name, description: t.description, discountCents, isActive: true, deletedAt: null },
        create: { slug: t.slug, name: t.name, description: t.description, discountCents, isActive: true },
      })
      await tx.kitItem.deleteMany({ where: { kitId: kit.id } })
      await tx.kitItem.createMany({
        data: items.map((i, order) => ({ kitId: kit.id, productId: i.productId, quantity: 1, order })),
      })
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
