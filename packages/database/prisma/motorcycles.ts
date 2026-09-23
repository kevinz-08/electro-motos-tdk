/**
 * Catálogo inicial de marcas y modelos de moto (docs/seo/, Fase 2).
 *
 * Ejecutar con: `pnpm db:motos`
 *
 * QUÉ ES Y QUÉ NO ES ESTE ARCHIVO
 *
 * Es el esqueleto del sistema de compatibilidad: marcas y modelos de moto, con
 * los alias con los que la gente los busca de verdad ("NKD", "boxer", "ns200").
 *
 * DE DÓNDE SALEN ESTOS NOMBRES — importa, porque el proyecto prohíbe inventar
 * datos:
 *   - Los **10 modelos prioritarios** salen de la lista que da el propio brief
 *     (docs/seo/AGENT-BRIEF.md §2): NKD 125, Boxer CT100, NMAX 155, XR190L,
 *     DR150, Pulsar NS/N, FZ, Hunk 125R, Apache y Raider.
 *   - El resto son modelos conocidos del mercado colombiano que se añadieron
 *     para que el selector no se vea vacío. **No están confirmados contra las
 *     ventas reales de H2R ni contra Search Console** → tarea H-04.
 *   - Un modelo de más no hace daño: sin compatibilidades verificadas no genera
 *     página, no entra al sitemap y solo ocupa una línea del selector. Uno mal
 *     escrito sí molesta, porque el importador de CSV lo buscará por ese nombre.
 *     Revisar y ajustar la lista antes de cargar compatibilidades.
 *
 * **No contiene ni una sola compatibilidad.** Dar de alta un modelo no afirma
 * nada sobre ningún producto: un modelo sin fitments verificados no genera hub,
 * no entra al sitemap y responde 404. Las compatibilidades las carga el equipo
 * con datos reales desde `POST /admin/fitments/import` (tarea H-02).
 *
 * SOBRE LOS DATOS QUE SÍ LLEVA:
 *   - `cc` solo se rellena cuando la cilindrada está **en el propio nombre del
 *     modelo** (NKD *125*, NMAX *155*, DR*150*). Donde no lo está —Navi,
 *     Crypton, FZ 2.0, FZ 25, Eco Deluxe— va `null`, aunque el dato "se sepa":
 *     si no viene de una fuente confirmada, no se declara. La web simplemente
 *     no muestra el cilindraje de esos modelos.
 *   - `yearFrom` y `yearTo` van todos en `null`: no hay una fuente confirmada de
 *     los años de comercialización en Colombia. Los completa un humano
 *     (tarea H-04) y hasta entonces la web no muestra años.
 *   - `intro` va en `null`: el texto introductorio del hub lo escribe alguien
 *     con conocimiento mecánico, no se genera.
 *
 * El script es idempotente: se puede correr las veces que haga falta. Actualiza
 * nombre, cilindrada y alias, y **nunca borra** modelos ni compatibilidades.
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
const prisma = new PrismaClient({ adapter })

interface SeedModel {
  name: string
  slug: string
  /** Solo si está en el nombre del modelo. */
  cc: number | null
  /** Cómo lo escribe la gente al buscar. */
  aliases: string[]
}

interface SeedBrand {
  name: string
  slug: string
  /** Orden en el selector: primero las marcas con más parque en Colombia. */
  order: number
  models: SeedModel[]
}

const CATALOG: SeedBrand[] = [
  {
    name: 'AKT',
    slug: 'akt',
    order: 1,
    models: [
      { name: 'NKD 125', slug: 'nkd-125', cc: 125, aliases: ['NKD', 'AK125NKD', 'NKD125'] },
      { name: 'AK 125 SS', slug: 'ak-125-ss', cc: 125, aliases: ['AK125SS', 'SS 125'] },
      { name: 'Dynamic 125', slug: 'dynamic-125', cc: 125, aliases: ['Dynamic', 'AK125 Dynamic'] },
      { name: 'TTR 180', slug: 'ttr-180', cc: 180, aliases: ['TTR', 'TTR180'] },
    ],
  },
  {
    name: 'Bajaj',
    slug: 'bajaj',
    order: 2,
    models: [
      { name: 'Boxer CT100', slug: 'boxer-ct100', cc: 100, aliases: ['Boxer', 'CT100', 'CT 100'] },
      { name: 'Boxer CT125', slug: 'boxer-ct125', cc: 125, aliases: ['CT125', 'CT 125'] },
      { name: 'Pulsar NS 200', slug: 'pulsar-ns-200', cc: 200, aliases: ['NS200', 'NS 200', 'Pulsar NS200'] },
      { name: 'Pulsar NS 160', slug: 'pulsar-ns-160', cc: 160, aliases: ['NS160', 'NS 160'] },
      { name: 'Pulsar N250', slug: 'pulsar-n250', cc: 250, aliases: ['N250', 'Pulsar N 250'] },
      { name: 'Discover 125', slug: 'discover-125', cc: 125, aliases: ['Discover'] },
      // Añadido el 2026-09-22 (docs/seo/modelos-faltantes-en-catalogo.md). La
      // nota original decía "PULSAR 400 Z / NS" sin distinguir variante; se
      // carga como un solo modelo hasta confirmar si son dos motos distintas.
      { name: 'Pulsar 400', slug: 'pulsar-400', cc: 400, aliases: ['Pulsar 400Z', 'Pulsar 400 Z', 'Pulsar 400 NS', '400Z'] },
    ],
  },
  {
    name: 'Honda',
    slug: 'honda',
    order: 3,
    models: [
      { name: 'XR190L', slug: 'xr190l', cc: 190, aliases: ['XR 190', 'XR190'] },
      { name: 'CB125F', slug: 'cb125f', cc: 125, aliases: ['CB 125', 'CB125'] },
      { name: 'CB160F', slug: 'cb160f', cc: 160, aliases: ['CB 160', 'CB160'] },
      { name: 'Navi', slug: 'navi', cc: null, aliases: ['Honda Navi'] },
      // Añadido el 2026-09-22 (docs/seo/modelos-faltantes-en-catalogo.md).
      { name: 'CB190R', slug: 'cb190r', cc: 190, aliases: ['CB 190R', 'CB190'] },
    ],
  },
  {
    name: 'Yamaha',
    slug: 'yamaha',
    order: 4,
    models: [
      { name: 'NMAX 155', slug: 'nmax-155', cc: 155, aliases: ['NMAX', 'N-MAX', 'NMAX155'] },
      { name: 'FZ 2.0', slug: 'fz-2-0', cc: null, aliases: ['FZ', 'FZ2.0', 'FZ 150'] },
      { name: 'FZ 25', slug: 'fz-25', cc: null, aliases: ['FZ25', 'FZ 250'] },
      { name: 'Crypton', slug: 'crypton', cc: null, aliases: ['Crypton 110'] },
      { name: 'XTZ 125', slug: 'xtz-125', cc: 125, aliases: ['XTZ', 'XTZ125'] },
      // Añadidos el 2026-09-22 al cruzar las notas de compatibilidad ya
      // existentes en las fichas (docs/seo/modelos-faltantes-en-catalogo.md).
      // XTZ 250: cilindrada distinta a la XTZ 125 de arriba — modelo aparte, no
      // un alias. El alias corto "XTZ" de la XTZ 125 generaba falsos positivos
      // contra este modelo en el análisis; aquí se usa "XTZ 250" completo.
      { name: 'XTZ 250', slug: 'xtz-250', cc: 250, aliases: ['XTZ250'] },
      { name: 'BWS 125', slug: 'bws-125', cc: 125, aliases: ['BWS', 'BWS125'] },
      // "MT-15" y "R15" traen un número en el nombre que no es la cilindrada real
      // (~155 cc ambas): igual que con FZ 2.0, se deja cc en null en vez de
      // adivinar a partir de un número que no lo es.
      { name: 'MT-15', slug: 'mt-15', cc: null, aliases: ['MT 15', 'MT15', 'Yamaha MT-15'] },
      { name: 'R15', slug: 'r15', cc: null, aliases: ['R 15', 'YZF R15'] },
    ],
  },
  {
    name: 'Suzuki',
    slug: 'suzuki',
    order: 5,
    models: [
      { name: 'DR150', slug: 'dr150', cc: 150, aliases: ['DR 150', 'DR-150'] },
      { name: 'GN 125', slug: 'gn-125', cc: 125, aliases: ['GN125', 'GN'] },
      // El alias corto "Gixxer" (sin número) generaba falsos positivos contra
      // "Gixxer 250" en el análisis de compatibilidades; no se repite ese alias
      // en el modelo de abajo.
      { name: 'Gixxer 150', slug: 'gixxer-150', cc: 150, aliases: ['Gixxer'] },
      { name: 'Gixxer 250', slug: 'gixxer-250', cc: 250, aliases: ['Gixxer250'] },
    ],
  },
  {
    name: 'Hero',
    slug: 'hero',
    order: 6,
    models: [
      { name: 'Hunk 125R', slug: 'hunk-125r', cc: 125, aliases: ['Hunk', 'Hunk 125'] },
      { name: 'Eco Deluxe', slug: 'eco-deluxe', cc: null, aliases: ['Eco', 'Ecodeluxe'] },
      { name: 'Xpulse 200', slug: 'xpulse-200', cc: 200, aliases: ['Xpulse', 'X-Pulse'] },
    ],
  },
  {
    name: 'TVS',
    slug: 'tvs',
    order: 7,
    models: [
      { name: 'Apache RTR 160', slug: 'apache-rtr-160', cc: 160, aliases: ['Apache', 'RTR 160', 'RTR160'] },
      { name: 'Apache RTR 200', slug: 'apache-rtr-200', cc: 200, aliases: ['RTR 200', 'RTR200'] },
      { name: 'Raider 125', slug: 'raider-125', cc: 125, aliases: ['Raider'] },
      { name: 'Sport 100', slug: 'sport-100', cc: 100, aliases: ['TVS Sport'] },
    ],
  },
  {
    name: 'Victory',
    slug: 'victory',
    order: 8,
    models: [
      { name: 'Bomber 125', slug: 'bomber-125', cc: 125, aliases: ['Bomber'] },
      { name: 'One 125', slug: 'one-125', cc: 125, aliases: ['Victory One'] },
      { name: 'MRX 150', slug: 'mrx-150', cc: 150, aliases: ['MRX'] },
    ],
  },
  // Marcas añadidas el 2026-09-22 al cruzar las notas de compatibilidad ya
  // existentes en las fichas (docs/seo/modelos-faltantes-en-catalogo.md).
  {
    name: 'KTM',
    slug: 'ktm',
    order: 9,
    models: [
      // Las notas originales distinguen "NG" y "WO" sin explicar qué significan
      // esas siglas — se guardan tal cual como alias en vez de interpretarlas.
      { name: 'Duke 200', slug: 'duke-200', cc: 200, aliases: ['KTM 200', 'Duke 200 NG', 'Duke 200 WO', '200 NG', '200 WO'] },
    ],
  },
  {
    name: 'Kawasaki',
    slug: 'kawasaki',
    order: 10,
    models: [
      { name: 'Z250', slug: 'z250', cc: 250, aliases: ['Kawasaki Z250'] },
    ],
  },
]

async function main() {
  let brandCount = 0
  let modelCount = 0

  for (const brand of CATALOG) {
    const savedBrand = await prisma.motorcycleBrand.upsert({
      where: { slug: brand.slug },
      create: { name: brand.name, slug: brand.slug, order: brand.order },
      update: { name: brand.name, order: brand.order },
    })
    brandCount++

    for (const model of brand.models) {
      await prisma.motorcycleModel.upsert({
        where: { brandId_slug: { brandId: savedBrand.id, slug: model.slug } },
        create: {
          brandId: savedBrand.id,
          name: model.name,
          slug: model.slug,
          cc: model.cc,
          aliases: model.aliases,
          // yearFrom, yearTo e intro se quedan en null a propósito: no hay dato
          // confirmado y no se inventa.
        },
        // No se tocan `intro`, `yearFrom` ni `yearTo`: si un humano ya los
        // rellenó, volver a correr el script no debe borrarlos.
        update: { name: model.name, cc: model.cc, aliases: model.aliases },
      })
      modelCount++
    }
  }

  const fitments = await prisma.fitment.count()
  const verified = await prisma.fitment.count({ where: { verified: true } })

  console.log(`\n✔ Catálogo de motos actualizado: ${brandCount} marcas, ${modelCount} modelos.`)
  console.log(`  Compatibilidades en la base de datos: ${fitments} (${verified} verificadas).`)

  if (verified === 0) {
    console.log(
      '\n  Ningún modelo se publicará todavía: un hub sin compatibilidades verificadas\n' +
        '  responde 404 y no entra al sitemap, a propósito.\n' +
        '  Carga las compatibilidades reales con POST /admin/fitments/import\n' +
        '  (plantilla en docs/seo/plantilla-compatibilidades.csv).\n',
    )
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
