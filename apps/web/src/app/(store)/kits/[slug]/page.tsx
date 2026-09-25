/**
 * `/kits/[slug]` — ficha de un kit (docs/seo/plan-kits.md, Fase 4 ítem 8).
 *
 * Mismo criterio que `/producto/[slug]`: `generateStaticParams` solo prerenderiza
 * kits visibles (activos, con disponibilidad); un kit sin stock responde 404 en
 * vez de quedar indexado sin poder comprarse.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { kitJsonLd } from '@/lib/structured-data'
import { canonical, NOINDEX_FOLLOW } from '@/lib/seo'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { PriceTag } from '@/components/store/PriceTag'
import { KitCard } from '@/components/store/KitCard'
import { TrackEvent } from '@/components/analytics/TrackEvent'
import { toPesos } from '@/lib/analytics'
import { getCachedAllVisibleKits, getCachedKitBySlug } from '@/lib/cache'

export const revalidate = 300

export async function generateStaticParams() {
  // Sin la tabla (migración aún no aplicada) el build no debe caerse: se
  // prerenderiza sin kits y la ruta cae a render dinámico hasta que existan.
  try {
    const kits = await getCachedAllVisibleKits()
    return kits.map((k) => ({ slug: k.slug }))
  } catch (e) {
    console.error('[kits] no se pudo generar la lista estática de kits', e)
    return []
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  let kit: Awaited<ReturnType<typeof getCachedKitBySlug>> = null
  try {
    kit = await getCachedKitBySlug(slug)
  } catch {
    /* sin la tabla aún: se trata como "no encontrado" */
  }
  if (!kit) return { title: 'Kit no encontrado', robots: NOINDEX_FOLLOW }

  const items = kit.items.map((i) => i.name).join(', ')
  return {
    title: kit.name,
    description: kit.description ?? `${kit.name}: ${items}. Precio total y envío a toda Colombia.`,
    alternates: canonical(`/kits/${kit.slug}`),
    robots: { index: kit.availableUnits > 0, follow: true },
  }
}

export default async function KitPage({ params }: PageProps) {
  const { slug } = await params
  let kit: Awaited<ReturnType<typeof getCachedKitBySlug>> = null
  try {
    kit = await getCachedKitBySlug(slug)
  } catch (e) {
    console.error('[kits] no se pudo leer el kit', e)
  }
  if (!kit) notFound()

  const images = kit.items.flatMap((i) => (i.image ? [cloudinaryUrl(i.image, 'detail')] : []))

  return (
    <div className="bg-white min-h-screen">
      <TrackEvent
        name="view_item"
        params={{ currency: 'COP', value: toPesos(kit.price), items: [{ item_id: kit.slug, item_name: kit.name, price: toPesos(kit.price), quantity: 1, item_list_name: 'kit' }] }}
      />
      {/* El BreadcrumbList lo emite el componente <Breadcrumbs> de abajo: no se duplica aquí. */}
      <JsonLd
        data={kitJsonLd({ name: kit.name, slug: kit.slug, description: kit.description, price: kit.price, availableUnits: kit.availableUnits, images })}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Kits', href: '/kits' }, { label: kit.name }]} />

        <h1 className="mt-6 text-3xl font-black text-gray-900 tracking-tight">{kit.name}</h1>
        {kit.description && <p className="mt-3 max-w-2xl text-gray-600 leading-relaxed">{kit.description}</p>}

        <div className="mt-6">
          <PriceTag price={kit.price} compareAtPrice={kit.discountCents > 0 ? kit.itemsTotal : null} size="lg" />
        </div>

        <h2 className="mt-10 text-lg font-bold text-gray-900">Incluye</h2>
        <ul className="mt-4 divide-y divide-gray-100 border-y border-gray-100">
          {kit.items.map((item) => (
            <li key={item.productId} className="flex items-center gap-4 py-4">
              <Link href={`/producto/${item.slug}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                {item.image ? (
                  <Image src={cloudinaryUrl(item.image, 'thumbnail')} alt={item.name} fill sizes="64px" className="object-contain p-1" />
                ) : (
                  <span className="flex h-full items-center justify-center text-xl text-gray-300">📦</span>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/producto/${item.slug}`} className="font-semibold text-gray-900 hover:text-sky-600">
                  {item.name}
                </Link>
                <p className="text-xs text-gray-400">SKU: {item.sku} · Cantidad: {item.quantity}</p>
              </div>
              <p className="shrink-0 text-sm text-gray-500">{(item.price * item.quantity / 100).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 max-w-md">
          <KitCard kit={kit} />
        </div>
      </div>
    </div>
  )
}
