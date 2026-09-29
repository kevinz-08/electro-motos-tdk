/**
 * `/repuestos` — índice de repuestos por moto (docs/seo/, Fase 5 — ítem 8).
 *
 * Lista, agrupados por marca, los modelos que tienen hub publicado (al menos un
 * repuesto con compatibilidad verificada). Existe para el enlazado interno: el
 * selector "¿Qué moto tienes?" es JavaScript y un buscador no lo sigue, así que
 * sin esta página los hubs solo se alcanzaban desde las fichas de producto, a
 * 3–4 clics del home. Enlazada desde el footer, deja cada hub a 2 clics.
 *
 * Solo modelos publicables: un modelo sin compatibilidades verificadas no
 * aparece, igual que no tiene hub.
 */
import Link from 'next/link'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { canonical, NOINDEX_FOLLOW } from '@/lib/seo'
import { getCachedPublishableModels } from '@/lib/cache'

export const revalidate = 3600

async function loadModels() {
  try {
    return await getCachedPublishableModels()
  } catch (e) {
    console.error('[repuestos] no se pudo leer la lista de modelos', e)
    return []
  }
}

const TITLE = 'Repuestos por modelo de moto'
const DESCRIPTION =
  'Elige tu moto y ve solo los repuestos con compatibilidad verificada: pastillas, filtros, bujías, baterías, kits de arrastre y más para cada modelo.'

export async function generateMetadata(): Promise<Metadata> {
  const models = await loadModels()
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: canonical('/repuestos'),
    robots: models.length ? { index: true, follow: true } : NOINDEX_FOLLOW,
  }
}

export default async function ModelsIndexPage() {
  const models = await loadModels()

  const brands = new Map<string, { name: string; slug: string; models: typeof models }>()
  for (const model of models) {
    const entry = brands.get(model.brand.slug) ?? { name: model.brand.name, slug: model.brand.slug, models: [] }
    entry.models.push(model)
    brands.set(model.brand.slug, entry)
  }
  const grouped = [...brands.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Repuestos por moto' }]} />
        <h1 className="mt-6 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">{TITLE}</h1>
        <p className="mt-3 max-w-2xl text-gray-600">{DESCRIPTION}</p>

        {grouped.length === 0 ? (
          <p className="mt-10 text-sm text-gray-500">
            Estamos verificando compatibilidades. Mientras tanto, busca tu repuesto en el{' '}
            <Link href="/catalogo" className="text-sky-600 underline">catálogo</Link>.
          </p>
        ) : (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {grouped.map((brand) => (
              <section key={brand.slug} aria-labelledby={`marca-${brand.slug}`}>
                <h2 id={`marca-${brand.slug}`} className="text-lg font-bold text-gray-900">{brand.name}</h2>
                <ul className="mt-3 space-y-1.5">
                  {brand.models
                    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
                    .map((m) => (
                      <li key={m.id}>
                        <Link href={`/repuestos/${brand.slug}/${m.slug}`} className="text-sky-700 hover:underline">
                          Repuestos para {brand.name} {m.name}
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
