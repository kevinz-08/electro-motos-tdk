/**
 * `/llms.txt` (docs/seo/, Fase 6 — ítem 2), formato de llmstxt.org: un resumen
 * en Markdown de qué es H2R, qué vende, dónde entrega y cómo se paga, con
 * enlaces a los hubs por moto, las guías, el Índice de Precios y las políticas.
 *
 * Todo sale de la base de datos (`findStoreFacts`, hubs publicados, guías): no
 * hay cifras escritas a mano que puedan quedar viejas. Su adopción real por los
 * motores no está confirmada (ROADMAP), así que es deliberadamente simple.
 */
import { getCachedPublishableModels, getCachedPublishedGuideEntries, getCachedPublishedPriceIndex, getCachedStoreFacts } from '@/lib/cache'
import { prisma } from '@/infrastructure/database/prisma-client'
import { absoluteUrl } from '@/lib/seo'
import { PRICE_INDEX_PATH } from '@/lib/price-index'
import { RETURNS_DAYS, WARRANTY_MONTHS } from '@/lib/store-facts'

export const revalidate = 3600

const cop = (cents: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(cents / 100)

export async function GET() {
  const [facts, models, entries, priceIndex, categories] = await Promise.all([
    getCachedStoreFacts(),
    getCachedPublishableModels().catch(() => []),
    getCachedPublishedGuideEntries().catch(() => ({ guides: [], articles: [], reviewers: [] })),
    getCachedPublishedPriceIndex().catch(() => null),
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
      select: { name: true, slug: true, children: { orderBy: { name: 'asc' }, select: { name: true, _count: { select: { products: true } } } } },
    }),
  ])
  const { store, shipping } = facts
  const payments = ['PSE', 'Nequi', 'tarjetas de crédito y débito (Wompi)', ...(facts.cashOnDelivery ? ['pago contra entrega'] : [])]

  const lines: string[] = [
    `# ${store.name}`,
    '',
    `> Tienda en línea de repuestos y accesorios para moto (multimarca) con sede en ${store.address.locality}, ${store.address.region}, y envíos a toda Colombia. ${facts.activeProducts} referencias activas; ${facts.verifiedFitments} compatibilidades repuesto–moto verificadas con fuente para ${facts.modelsWithHub} modelos de moto.`,
    '',
    `- Razón social: ${store.legalName} · NIT ${store.taxId}`,
    `- Tienda física y recogida de pedidos: ${store.address.street}, ${store.address.locality} (${store.address.region}, Colombia)`,
    `- Envíos: a toda Colombia, entrega estimada de ${shipping.minDays} a ${shipping.maxDays} días hábiles${shipping.freeShippingFromCents > 0 ? `; envío gratis desde ${cop(shipping.freeShippingFromCents)}` : ''}`,
    `- Medios de pago: ${payments.join(', ')}`,
    `- Garantía: hasta ${WARRANTY_MONTHS} meses contra defectos de fábrica · cambios dentro de ${RETURNS_DAYS} días calendario`,
    `- Contacto: ${store.telephone} (WhatsApp) · ${store.email}`,
    '- Compatibilidad: solo se publica "le sirve a tu moto" cuando la compatibilidad está verificada con una fuente (manual, catálogo del fabricante o taller).',
    '',
    '## Repuestos por moto',
    '',
    `- [Índice de modelos de moto](${absoluteUrl('/repuestos')}): todos los modelos con repuestos de compatibilidad verificada`,
    ...models
      .slice()
      .sort((a, b) => `${a.brand.name} ${a.name}`.localeCompare(`${b.brand.name} ${b.name}`, 'es'))
      .map((m) => `- [Repuestos para ${m.brand.name} ${m.name}](${absoluteUrl(`/repuestos/${m.brand.slug}/${m.slug}`)})`),
    '',
    '## Catálogo por categoría',
    '',
    ...categories.map((c) => {
      const children = c.children.filter((ch) => ch._count.products > 0).map((ch) => ch.name)
      return `- [${c.name}](${absoluteUrl(`/catalogo?category=${c.slug}`)})${children.length ? `: ${children.join(', ')}` : ''}`
    }),
  ]

  if (entries.guides.length || entries.articles.length || priceIndex) {
    lines.push('', '## Guías y datos', '')
    if (priceIndex) {
      lines.push(`- [Índice de Precios de Repuestos de Moto en Colombia](${absoluteUrl(PRICE_INDEX_PATH)}): precio mediano por categoría, corte del ${priceIndex.cutoffDate}, con metodología`)
    }
    lines.push(
      ...entries.guides.map((g) => `- [Mantenimiento de la ${g.label}](${absoluteUrl(`/guias/mantenimiento/${g.brandSlug}/${g.modelSlug}`)}): intervalos con fuente y revisor técnico`),
      ...entries.articles.map((a) => `- [${a.title}](${absoluteUrl(`/guias/${a.slug}`)})`),
    )
  }

  lines.push(
    '',
    '## Empresa y políticas',
    '',
    `- [Por qué comprar en H2R](${absoluteUrl('/por-que-comprar-en-h2r')}): cifras verificables de la tienda`,
    `- [Sobre nosotros](${absoluteUrl('/sobre-nosotros')})`,
    `- [Garantías](${absoluteUrl('/garantias')})`,
    `- [Política de envíos](${absoluteUrl('/legal/politica-de-envios')})`,
    `- [Política de cambios](${absoluteUrl('/legal/politica-de-cambios')})`,
    `- [Contacto](${absoluteUrl('/contacto')})`,
    '',
  )

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
  })
}
