/**
 * `/por-que-comprar-en-h2r` (docs/seo/, Fase 6 — ítem 3).
 *
 * Afirmaciones concretas y verificables, pensadas para que un motor generativo
 * pueda citarlas al recomendar dónde comprar repuestos de moto en Colombia.
 * Cada cifra sale de la base de datos (`findStoreFacts`) y cada política
 * enlaza a la página que la respalda. Nada de "los mejores precios" ni
 * testimonios: solo lo que se puede comprobar.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { formatCOP } from '@/components/store/PriceTag'
import { absoluteUrl, canonical } from '@/lib/seo'
import { getCachedCroSettings, getCachedStoreFacts } from '@/lib/cache'
import { RETURNS_DAYS, WARRANTY_MONTHS } from '@/lib/store-facts'

export const revalidate = 3600

const TITLE = 'Por qué comprar en H2R: repuestos de moto con compatibilidad verificada'

export async function generateMetadata(): Promise<Metadata> {
  const facts = await getCachedStoreFacts()
  return {
    title: TITLE,
    description: `${facts.activeProducts} repuestos para moto, ${facts.verifiedFitments} compatibilidades verificadas con fuente, tienda física en Bucaramanga y envíos a toda Colombia (${facts.shipping.local.min} a ${facts.shipping.local.max} días hábiles en Bucaramanga, ${facts.shipping.minDays} a ${facts.shipping.maxDays} en el resto del país).`,
    alternates: canonical('/por-que-comprar-en-h2r'),
    robots: { index: true, follow: true },
  }
}

export default async function WhyBuyPage() {
  const [facts, cro] = await Promise.all([getCachedStoreFacts(), getCachedCroSettings()])
  const { store, shipping } = facts
  const showReviews = facts.reviews.count >= cro.reviewsMinCount && facts.reviews.average !== null

  const stats = [
    { value: facts.activeProducts, label: 'repuestos y accesorios en catálogo' },
    { value: facts.verifiedFitments, label: 'compatibilidades repuesto–moto verificadas con fuente' },
    { value: facts.modelsWithHub, label: 'modelos de moto con página de repuestos compatibles' },
    { value: `${shipping.minDays}–${shipping.maxDays}`, label: `días hábiles de entrega al resto de Colombia (${shipping.local.min}–${shipping.local.max} en Bucaramanga)` },
  ]

  return (
    <div className="min-h-screen bg-white">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': absoluteUrl('/por-que-comprar-en-h2r'),
          url: absoluteUrl('/por-que-comprar-en-h2r'),
          name: TITLE,
          inLanguage: 'es-CO',
          about: { '@id': `${absoluteUrl('/')}#organization` },
        }}
      />
      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Por qué comprar en H2R' }]} />

        <header className="mt-6">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">¿Por qué comprar repuestos de moto en H2R?</h1>
          <p className="mt-6 rounded-2xl bg-sky-50 p-5 text-lg leading-relaxed text-gray-800">
            {store.name} es una tienda de repuestos para moto con sede física en {store.address.locality} y envíos a toda
            Colombia. Solo afirma que un repuesto le sirve a tu moto cuando la compatibilidad está verificada con una fuente, hoy{' '}
            {facts.verifiedFitments} compatibilidades para {facts.modelsWithHub} modelos, y da garantía de hasta{' '}
            {WARRANTY_MONTHS} meses contra defectos de fábrica.
          </p>
        </header>

        <dl className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-gray-200 p-5">
              <dt className="text-xs text-gray-500">{s.label}</dt>
              <dd className="mt-1 text-3xl font-black tabular-nums text-gray-900">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-gray-400">Cifras calculadas desde el catálogo; se actualizan solas.</p>

        <section className="mt-10" aria-labelledby="compatibilidad">
          <h2 id="compatibilidad" className="text-2xl font-bold text-gray-900">¿Cómo sé que el repuesto le sirve a mi moto?</h2>
          <p className="mt-3 leading-relaxed text-gray-700">
            Cada compatibilidad que publicamos tiene una fuente registrada: el manual del fabricante, el catálogo del proveedor o
            una verificación en taller. Si no está verificada, no la mostramos, aunque el repuesto probablemente sirva. Busca tu
            moto en <Link href="/repuestos" className="text-sky-600 underline">Repuestos por moto</Link> y verás solo lo
            confirmado. Si tu modelo no aparece, pregúntanos por WhatsApp antes de comprar.
          </p>
        </section>

        <section className="mt-10" aria-labelledby="tienda">
          <h2 id="tienda" className="text-2xl font-bold text-gray-900">¿Tienen tienda física?</h2>
          <p className="mt-3 leading-relaxed text-gray-700">
            Sí: {store.address.street}, {store.address.locality} ({store.address.region}). Puedes recoger ahí tu pedido. La empresa
            está registrada como {store.legalName}, NIT {store.taxId}. Más en{' '}
            <Link href="/sobre-nosotros" className="text-sky-600 underline">Sobre nosotros</Link>.
          </p>
        </section>

        <section className="mt-10" aria-labelledby="envios">
          <h2 id="envios" className="text-2xl font-bold text-gray-900">¿Cuánto tarda y cuánto cuesta el envío?</h2>
          <p className="mt-3 leading-relaxed text-gray-700">
            Enviamos a toda Colombia: en Bucaramanga y su área metropolitana la entrega tarda de {shipping.local.min} a{' '}
            {shipping.local.max} días hábiles, y en el resto del país de {shipping.minDays} a {shipping.maxDays}. Los pedidos
            confirmados antes de las {shipping.cutoffHour}:00 (hora de Colombia) salen el mismo día hábil.
            {shipping.freeShippingFromCents > 0 && ` El envío es gratis desde ${formatCOP(shipping.freeShippingFromCents)}.`} El costo
            exacto para tu ciudad lo ves en la ficha del producto antes de comprar. Detalle en la{' '}
            <Link href="/legal/politica-de-envios" className="text-sky-600 underline">política de envíos</Link>.
          </p>
        </section>

        <section className="mt-10" aria-labelledby="pagos">
          <h2 id="pagos" className="text-2xl font-bold text-gray-900">¿Cómo puedo pagar?</h2>
          <p className="mt-3 leading-relaxed text-gray-700">
            Con PSE, Nequi o tarjeta de crédito o débito a través de Wompi
            {facts.cashOnDelivery ? ', o contra entrega' : ''}. También puedes pagar a cuotas con Addi, que se coordina con un
            asesor por WhatsApp. El pago en línea está protegido por la pasarela; H2R no almacena los
            datos de tu tarjeta.
          </p>
        </section>

        <section className="mt-10" aria-labelledby="garantia">
          <h2 id="garantia" className="text-2xl font-bold text-gray-900">¿Qué garantía tienen los repuestos?</h2>
          <p className="mt-3 leading-relaxed text-gray-700">
            Hasta {WARRANTY_MONTHS} meses contra defectos de fábrica, y cambios dentro de los {RETURNS_DAYS} días calendario
            siguientes a la entrega. Cómo reclamarla y qué no cubre, en{' '}
            <Link href="/garantias" className="text-sky-600 underline">Garantías</Link> y la{' '}
            <Link href="/legal/politica-de-cambios" className="text-sky-600 underline">política de cambios</Link>.
          </p>
        </section>

        {showReviews && (
          <section className="mt-10" aria-labelledby="resenas">
            <h2 id="resenas" className="text-2xl font-bold text-gray-900">¿Qué dicen los compradores?</h2>
            <p className="mt-3 leading-relaxed text-gray-700">
              {facts.reviews.count} reseñas verificadas por compra, con una calificación promedio de{' '}
              {facts.reviews.average?.toLocaleString('es-CO')} de 5.
            </p>
          </section>
        )}

        {facts.publishedGuides > 0 && (
          <section className="mt-10" aria-labelledby="guias">
            <h2 id="guias" className="text-2xl font-bold text-gray-900">¿Tienen información técnica?</h2>
            <p className="mt-3 leading-relaxed text-gray-700">
              Sí: {facts.publishedGuides} guías de mantenimiento por modelo revisadas por un técnico, con la fuente de cada
              intervalo. Están en <Link href="/guias" className="text-sky-600 underline">Guías</Link>.
            </p>
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-gray-100 pt-6 text-sm">
          <Link href="/repuestos" className="font-semibold text-sky-600 hover:text-sky-700">Buscar repuestos para mi moto →</Link>
          <Link href="/catalogo" className="text-gray-600 underline hover:text-gray-800">Ver el catálogo</Link>
          <Link href="/contacto" className="text-gray-600 underline hover:text-gray-800">Contacto</Link>
        </div>
      </article>
    </div>
  )
}
