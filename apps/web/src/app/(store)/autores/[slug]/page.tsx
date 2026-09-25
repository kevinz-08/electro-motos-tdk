/**
 * `/autores/[slug]` — página de un revisor técnico (docs/seo/, Fase 5 — H-21).
 *
 * Es la pieza de E-E-A-T del proyecto: quién revisa las guías, con su foto,
 * su trayectoria y las guías que firma. Todo sale de lo que el administrador
 * escribió en `/admin/revisores`. Un revisor desactivado, inexistente o cuya
 * lectura falle responde 404: nunca se muestra una página a medias.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { formatExperience } from '@h2r/domain'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { personJsonLd } from '@/lib/structured-data'
import { canonical, NOINDEX_FOLLOW } from '@/lib/seo'
import { getCachedPublishedGuideEntries, getCachedReviewerBySlug } from '@/lib/cache'

export const revalidate = 600

async function loadReviewer(slug: string) {
  try {
    return await getCachedReviewerBySlug(slug)
  } catch (e) {
    // Sin las tablas de la Fase 5 (migración sin aplicar) el sitio sigue funcionando.
    console.error('[guias] no se pudo leer el revisor', e)
    return null
  }
}

export async function generateStaticParams() {
  try {
    const { reviewers } = await getCachedPublishedGuideEntries()
    return reviewers.map((r) => ({ slug: r.slug }))
  } catch (e) {
    console.error('[guias] no se pudo generar la lista estática de revisores', e)
    return []
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const reviewer = await loadReviewer(slug)
  if (!reviewer) return { title: 'Revisor no encontrado', robots: NOINDEX_FOLLOW }

  return {
    title: `${reviewer.name}${reviewer.headline ? `, ${reviewer.headline}` : ''} — revisor técnico`,
    description: reviewer.bio.slice(0, 155),
    alternates: canonical(`/autores/${reviewer.slug}`),
    robots: { index: true, follow: true },
  }
}

export default async function ReviewerPage({ params }: PageProps) {
  const { slug } = await params
  const reviewer = await loadReviewer(slug)
  if (!reviewer) notFound()

  const experience = formatExperience(reviewer.yearsExperience)

  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={personJsonLd(reviewer)} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Revisores técnicos' }, { label: reviewer.name }]} />

        <header className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {reviewer.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={reviewer.photoUrl} alt={reviewer.name} width={160} height={160} className="h-32 w-32 shrink-0 rounded-full object-cover sm:h-40 sm:w-40" />
          ) : (
            <span aria-hidden="true" className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-gray-100 text-4xl sm:h-40 sm:w-40">🔧</span>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">Revisor técnico</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">{reviewer.name}</h1>
            {reviewer.headline && <p className="mt-1 text-lg text-gray-600">{reviewer.headline}</p>}
            {experience && <p className="mt-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">{experience}</p>}
          </div>
        </header>

        <section className="mt-10" aria-labelledby="trayectoria">
          <h2 id="trayectoria" className="text-xl font-bold text-gray-900">Trayectoria</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-gray-700">{reviewer.bio}</p>
        </section>

        {reviewer.credentials.length > 0 && (
          <section className="mt-8" aria-labelledby="formacion">
            <h2 id="formacion" className="text-xl font-bold text-gray-900">Formación y certificaciones</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-gray-700">
              {reviewer.credentials.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </section>
        )}

        {reviewer.guides.length > 0 && (
          <section className="mt-8" aria-labelledby="guias">
            <h2 id="guias" className="text-xl font-bold text-gray-900">Guías que revisó</h2>
            <ul className="mt-3 space-y-2">
              {reviewer.guides.map((g) => (
                <li key={g.href}>
                  <Link href={g.href} className="text-sky-600 underline hover:text-sky-700">
                    Mantenimiento de la {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
