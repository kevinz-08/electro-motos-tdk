/**
 * `/guias/[slug]` — artículo de contenido (docs/seo/, Fase 5 — ítem 1):
 * comparativas, guía de revisión técnico-mecánica y demás guías de texto libre.
 *
 * Solo existe si el artículo está PUBLICADO con un revisor técnico activo
 * (`isArticlePublishable`); si no, 404. Formato para que buscadores e IAs lo
 * citen: respuesta directa de 40–60 palabras arriba, índice de encabezados,
 * fuentes visibles, revisor con enlace a su página y fecha de actualización.
 *
 * `/guias/mantenimiento/...` es una ruta propia; el slug "mantenimiento" está
 * reservado en el dominio para que no choquen.
 */
import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ARTICLE_KIND_LABELS, extractArticleHeadings, formatExperience, parseArticleBody } from '@h2r/domain'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { ArticleBody } from '@/components/content/ArticleBody'
import { articleJsonLd } from '@/lib/structured-data'
import { canonical, NOINDEX_FOLLOW } from '@/lib/seo'
import { WHATSAPP_URL } from '@/lib/contact'
import { getCachedPublishedArticle, getCachedPublishedGuideEntries } from '@/lib/cache'

export const revalidate = 600

async function loadArticle(slug: string) {
  try {
    return await getCachedPublishedArticle(slug)
  } catch (e) {
    // Sin la tabla de artículos (migración sin aplicar) el sitio sigue funcionando.
    console.error('[guias] no se pudo leer el artículo', e)
    return null
  }
}

export async function generateStaticParams() {
  try {
    const { articles } = await getCachedPublishedGuideEntries()
    return articles.map((a) => ({ slug: a.slug }))
  } catch (e) {
    console.error('[guias] no se pudo generar la lista estática de artículos', e)
    return []
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' })

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await loadArticle(slug)
  if (!article) return { title: 'Guía no encontrada', robots: NOINDEX_FOLLOW }

  return {
    title: article.title,
    description: (article.metaDescription ?? article.directAnswer).slice(0, 158),
    alternates: canonical(`/guias/${article.slug}`),
    robots: { index: true, follow: true },
    openGraph: { type: 'article', publishedTime: article.publishedAt, modifiedTime: article.updatedAt },
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params
  const article = await loadArticle(slug)
  if (!article) notFound()

  const blocks = parseArticleBody(article.body)
  const headings = extractArticleHeadings(blocks)
  const { reviewer, model } = article
  const experience = formatExperience(reviewer.yearsExperience)
  const modelLabel = model ? `${model.brandName} ${model.name}` : null

  return (
    <div className="min-h-screen bg-white">
      <JsonLd
        data={articleJsonLd({
          slug: article.slug,
          title: article.title,
          description: article.metaDescription ?? article.directAnswer,
          authorName: article.authorName,
          publishedAt: article.publishedAt,
          updatedAt: article.updatedAt,
          reviewedAt: article.reviewedAt,
          reviewer: { name: reviewer.name, slug: reviewer.slug },
          sources: article.sources,
        })}
      />
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Guías', href: '/guias' }, { label: article.title }]} />

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-600">{ARTICLE_KIND_LABELS[article.kind]}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">{article.title}</h1>
          <p className="mt-3 text-sm text-gray-500">
            Por {article.authorName} · Revisado por{' '}
            <Link href={`/autores/${reviewer.slug}`} className="font-medium text-sky-600 underline hover:text-sky-700">
              {reviewer.name}
            </Link>{' '}
            el <time dateTime={article.reviewedAt.slice(0, 10)}>{formatDate(article.reviewedAt)}</time> · Última actualización:{' '}
            <time dateTime={article.updatedAt.slice(0, 10)}>{formatDate(article.updatedAt)}</time>
          </p>
          {/* Respuesta directa: lo primero que lee una persona, un buscador o una IA. */}
          <p className="mt-6 rounded-2xl bg-sky-50 p-5 text-lg leading-relaxed text-gray-800">{article.directAnswer}</p>
        </header>

        {headings.length >= 3 && (
          <nav aria-label="Contenido" className="mt-8 rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-900">En esta guía</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
              {headings.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`} className="text-sky-600 hover:underline">
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mt-2">
          <ArticleBody blocks={blocks} />
        </div>

        <section className="mt-12" aria-labelledby="fuentes">
          <h2 id="fuentes" className="text-xl font-bold text-gray-900">
            ¿De dónde salen estos datos?
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-gray-700">
            {article.sources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="revisor">
          <h2 id="revisor" className="text-xl font-bold text-gray-900">
            ¿Quién revisó esta guía?
          </h2>
          <div className="mt-4 flex flex-col gap-5 rounded-2xl border border-gray-200 p-5 sm:flex-row sm:items-center">
            {reviewer.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={reviewer.photoUrl} alt={reviewer.name} width={80} height={80} className="h-20 w-20 shrink-0 rounded-full object-cover" />
            ) : (
              <span aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-sky-50">
                <Wrench className="h-8 w-8 text-sky-500" />
              </span>
            )}
            <div className="text-sm text-gray-700">
              <p>
                <Link href={`/autores/${reviewer.slug}`} className="text-base font-bold text-gray-900 underline-offset-2 hover:underline">
                  {reviewer.name}
                </Link>
                {reviewer.headline && <span className="text-gray-500"> · {reviewer.headline}</span>}
              </p>
              {experience && <p className="mt-0.5 text-gray-500">{experience}</p>}
              <p className="mt-2">
                <strong className="font-semibold text-gray-900">Revisión:</strong> {formatDate(article.reviewedAt)}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-gray-100 pt-6 text-sm">
          {model && modelLabel && (
            <Link href={`/repuestos/${model.brandSlug}/${model.slug}`} className="font-semibold text-sky-600 hover:text-sky-700">
              Repuestos para la {modelLabel} →
            </Link>
          )}
          <Link href="/guias" className="text-gray-600 underline hover:text-gray-800">
            Más guías
          </Link>
          <a
            href={WHATSAPP_URL(`Hola H2R, leí la guía "${article.title}" y tengo una pregunta.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 underline hover:text-gray-700"
          >
            ¿Dudas? Escríbenos por WhatsApp
          </a>
        </div>
      </article>
    </div>
  )
}
