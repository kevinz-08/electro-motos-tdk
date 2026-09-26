/**
 * `/guias` — índice de contenido (docs/seo/, Fase 5): artículos publicados y
 * guías de mantenimiento por modelo. Es el nodo que conecta el contenido con el
 * resto del sitio (enlazado interno, ítem 8): desde el home/footer se llega aquí
 * y de aquí a cada guía.
 *
 * Solo lista lo publicable. Mientras no haya nada que listar la página existe
 * (no rompe enlaces) pero va con `noindex` y no entra al sitemap: una página de
 * índice vacía no aporta nada a un buscador.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { ARTICLE_KIND_LABELS, type ArticleKind } from '@h2r/domain'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { canonical, NOINDEX_FOLLOW } from '@/lib/seo'
import { getCachedPublishedGuideEntries } from '@/lib/cache'

export const revalidate = 600

async function loadEntries() {
  try {
    return await getCachedPublishedGuideEntries()
  } catch (e) {
    console.error('[guias] no se pudo leer el índice de guías', e)
    return { guides: [], articles: [], reviewers: [] }
  }
}

const TITLE = 'Guías de repuestos y mantenimiento de motos'
const DESCRIPTION =
  'Guías revisadas por un técnico: intervalos de mantenimiento por modelo, comparativas de repuestos y consejos para elegir la pieza correcta para tu moto.'

export async function generateMetadata(): Promise<Metadata> {
  const { guides, articles } = await loadEntries()
  const empty = guides.length + articles.length === 0
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: canonical('/guias'),
    robots: empty ? NOINDEX_FOLLOW : { index: true, follow: true },
  }
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' })

export default async function GuidesIndexPage() {
  const { guides, articles } = await loadEntries()
  const byKind = (kind: ArticleKind) => articles.filter((a) => a.kind === kind)
  const sections = (['GUIA', 'COMPARATIVA'] as const).filter((k) => byKind(k).length > 0)

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Guías' }]} />
        <h1 className="mt-6 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">{TITLE}</h1>
        <p className="mt-3 max-w-2xl text-gray-600">{DESCRIPTION}</p>

        {guides.length + articles.length === 0 && (
          <p className="mt-10 rounded-2xl border border-gray-200 p-6 text-sm text-gray-500">
            Estamos preparando las primeras guías con nuestro revisor técnico. Mientras tanto, busca tu repuesto en el{' '}
            <Link href="/catalogo" className="text-sky-600 underline">
              catálogo
            </Link>
            .
          </p>
        )}

        {guides.length > 0 && (
          <section className="mt-10" aria-labelledby="mantenimiento">
            <h2 id="mantenimiento" className="text-2xl font-bold text-gray-900">
              Mantenimiento por modelo
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {guides.map((g) => (
                <li key={`${g.brandSlug}/${g.modelSlug}`}>
                  <Link
                    href={`/guias/mantenimiento/${g.brandSlug}/${g.modelSlug}`}
                    className="block rounded-xl border border-gray-200 p-4 transition-colors hover:border-sky-300"
                  >
                    <span className="block font-semibold text-gray-900">Mantenimiento de la {g.label}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">Revisada el {formatDate(g.reviewedAt.toISOString())}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {sections.map((kind) => (
          <section key={kind} className="mt-10" aria-labelledby={`k-${kind}`}>
            <h2 id={`k-${kind}`} className="text-2xl font-bold text-gray-900">
              {kind === 'GUIA' ? 'Guías' : 'Comparativas'}
            </h2>
            <ul className="mt-4 space-y-3">
              {byKind(kind).map((a) => (
                <li key={a.slug}>
                  <Link href={`/guias/${a.slug}`} className="block rounded-xl border border-gray-200 p-4 transition-colors hover:border-sky-300">
                    <span className="text-xs font-semibold uppercase tracking-wide text-sky-600">{ARTICLE_KIND_LABELS[a.kind]}</span>
                    <span className="mt-1 block font-semibold text-gray-900">{a.title}</span>
                    <span className="mt-1 block line-clamp-2 text-sm text-gray-600">{a.directAnswer}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
