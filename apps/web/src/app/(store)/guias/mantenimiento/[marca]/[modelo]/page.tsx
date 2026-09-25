/**
 * `/guias/mantenimiento/[marca]/[modelo]` — guía de mantenimiento de un modelo
 * (docs/seo/, Fase 5 — H-20 + H-21).
 *
 * Todo lo que dice sale de lo que el administrador guardó en
 * `/admin/mantenimiento`: los intervalos, la fuente, el revisor y la fecha de
 * revisión. La página no escribe ni un número por su cuenta.
 *
 *   - Sin guía guardada para el modelo → 404. No existe una versión genérica.
 *   - Guía guardada pero con el revisor desactivado → 404 (nunca se publica
 *     contenido sin alguien que lo firme).
 *
 * Formato pensado para que buscadores y motores generativos la citen: abre con
 * una respuesta directa armada con los datos reales, encabezados en forma de
 * pregunta, una tabla, y la fecha de revisión y el revisor a la vista.
 */
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { formatExperience, formatKm, formatMonths } from '@h2r/domain'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { formatCOP } from '@/components/store/PriceTag'
import { maintenanceGuideJsonLd } from '@/lib/structured-data'
import { canonical, NOINDEX_FOLLOW } from '@/lib/seo'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { WHATSAPP_URL } from '@/lib/contact'
import { getCachedMaintenanceGuide, getCachedPublishedGuideEntries } from '@/lib/cache'

export const revalidate = 600

async function loadGuide(marca: string, modelo: string) {
  try {
    return await getCachedMaintenanceGuide(marca, modelo)
  } catch (e) {
    // Sin las tablas de la Fase 5 (migración sin aplicar) el sitio sigue funcionando.
    console.error('[guias] no se pudo leer la guía de mantenimiento', e)
    return null
  }
}

export async function generateStaticParams() {
  try {
    const { guides } = await getCachedPublishedGuideEntries()
    return guides.map((g) => ({ marca: g.brandSlug, modelo: g.modelSlug }))
  } catch (e) {
    console.error('[guias] no se pudo generar la lista estática de guías', e)
    return []
  }
}

interface PageProps {
  params: Promise<{ marca: string; modelo: string }>
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' })

/** Respuesta directa de apertura: se arma solo con los datos guardados. */
function buildIntro(guide: NonNullable<Awaited<ReturnType<typeof loadGuide>>>, modelLabel: string) {
  const n = guide.items.length
  return (
    `Esta guía reúne los intervalos de mantenimiento preventivo de la ${modelLabel}: ` +
    `${n} ${n === 1 ? 'punto de control' : 'puntos de control'} con su intervalo en kilómetros o en meses. ` +
    `Los datos provienen de ${guide.source} y los revisó ${guide.reviewer.name} el ${formatDate(guide.reviewedAt)}.`
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marca, modelo } = await params
  const guide = await loadGuide(marca, modelo)
  if (!guide) return { title: 'Guía no encontrada', robots: NOINDEX_FOLLOW }

  const modelLabel = `${guide.model.brandName} ${guide.model.name}`
  return {
    title: `Mantenimiento de la ${modelLabel}: intervalos y repuestos`,
    description: buildIntro(guide, modelLabel).slice(0, 158),
    alternates: canonical(`/guias/mantenimiento/${marca}/${modelo}`),
    robots: { index: true, follow: true },
  }
}

export default async function MaintenanceGuidePage({ params }: PageProps) {
  const { marca, modelo } = await params
  const guide = await loadGuide(marca, modelo)
  if (!guide) notFound()

  const modelLabel = `${guide.model.brandName} ${guide.model.name}`
  const intro = buildIntro(guide, modelLabel)
  const { reviewer } = guide
  const experience = formatExperience(reviewer.yearsExperience)

  return (
    <div className="min-h-screen bg-white">
      <JsonLd
        data={maintenanceGuideJsonLd({
          brandSlug: guide.model.brandSlug,
          modelSlug: guide.model.slug,
          title: `Mantenimiento de la ${modelLabel}`,
          description: intro,
          reviewedAt: guide.reviewedAt,
          reviewer: { name: reviewer.name, slug: reviewer.slug },
          itemLabels: guide.items.map((i) => i.label),
        })}
      />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Guías de mantenimiento' }, { label: modelLabel }]} />

        <header className="mt-6">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            Mantenimiento de la {modelLabel}: intervalos y repuestos
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Revisada el <time dateTime={guide.reviewedAt.slice(0, 10)}>{formatDate(guide.reviewedAt)}</time> por{' '}
            <Link href={`/autores/${reviewer.slug}`} className="font-medium text-sky-600 underline hover:text-sky-700">
              {reviewer.name}
            </Link>
          </p>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-gray-700">{intro}</p>
        </header>

        <section className="mt-10" aria-labelledby="intervalos">
          <h2 id="intervalos" className="text-2xl font-bold text-gray-900">
            ¿Cada cuánto hay que hacerle mantenimiento a la {guide.model.name}?
          </h2>
          <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Intervalos de mantenimiento de la {modelLabel}</caption>
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Punto de control</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Cada (km)</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Cada (meses)</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Detalle</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Repuesto en H2R</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {guide.items.map((item) => (
                  <tr key={item.label} className="align-top">
                    <th scope="row" className="px-4 py-3 font-semibold text-gray-900">{item.label}</th>
                    <td className="px-4 py-3 text-gray-700">{item.intervalKm !== null ? formatKm(item.intervalKm) : '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{item.intervalMonths !== null ? formatMonths(item.intervalMonths) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      {item.product ? (
                        <Link href={`/producto/${item.product.slug}`} className="group flex items-center gap-3">
                          {item.product.image && (
                            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                              <Image src={cloudinaryUrl(item.product.image, 'thumbnail')} alt="" fill sizes="40px" className="object-contain p-0.5" />
                            </span>
                          )}
                          <span>
                            <span className="block font-medium text-sky-700 group-hover:underline">{item.product.name}</span>
                            <span className="block text-xs text-gray-500">
                              {formatCOP(item.product.price)}{item.product.stock === 0 && ' · Agotado'}
                            </span>
                          </span>
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {guide.notes && (
          <section className="mt-10" aria-labelledby="condiciones">
            <h2 id="condiciones" className="text-2xl font-bold text-gray-900">¿A qué condiciones aplican estos intervalos?</h2>
            <p className="mt-3 max-w-3xl whitespace-pre-line leading-relaxed text-gray-700">{guide.notes}</p>
          </section>
        )}

        <section className="mt-10" aria-labelledby="revision">
          <h2 id="revision" className="text-2xl font-bold text-gray-900">¿Quién revisó esta guía y de dónde salen los datos?</h2>
          <div className="mt-4 flex flex-col gap-5 rounded-2xl border border-gray-200 p-5 sm:flex-row sm:items-center">
            {reviewer.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={reviewer.photoUrl} alt={reviewer.name} width={80} height={80} className="h-20 w-20 shrink-0 rounded-full object-cover" />
            ) : (
              <span aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-100 text-2xl">🔧</span>
            )}
            <div className="text-sm text-gray-700">
              <p>
                <Link href={`/autores/${reviewer.slug}`} className="text-base font-bold text-gray-900 underline-offset-2 hover:underline">
                  {reviewer.name}
                </Link>
                {reviewer.headline && <span className="text-gray-500"> · {reviewer.headline}</span>}
              </p>
              {experience && <p className="mt-0.5 text-gray-500">{experience}</p>}
              <p className="mt-2"><strong className="font-semibold text-gray-900">Fuente de los intervalos:</strong> {guide.source}</p>
              <p className="mt-0.5"><strong className="font-semibold text-gray-900">Última revisión:</strong> {formatDate(guide.reviewedAt)}</p>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-gray-100 pt-6 text-sm">
          <Link href={`/catalogo?search=${encodeURIComponent(guide.model.name)}`} className="font-semibold text-sky-600 hover:text-sky-700">
            Ver repuestos para la {guide.model.name} →
          </Link>
          <a
            href={WHATSAPP_URL(`Hola H2R, tengo una ${modelLabel} y quiero consultar un repuesto de mantenimiento.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 underline hover:text-gray-700"
          >
            ¿Dudas con tu moto? Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
