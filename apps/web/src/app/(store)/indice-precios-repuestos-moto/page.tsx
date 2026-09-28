/**
 * `/indice-precios-repuestos-moto` — Índice de Precios de Repuestos de Moto
 * (docs/seo/, Fase 5 — ítem 4). La pieza pensada para enlaces de prensa y
 * citas de IA: datos propios, fecha de corte, metodología explícita.
 *
 * Pinta el último corte PUBLICADO tal como se guardó (no recalcula). Sin corte
 * publicado responde 404. La variación solo aparece contra un corte anterior
 * publicado con la misma metodología.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { comparePriceIndexes } from '@h2r/domain'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { PriceIndexChart } from '@/components/content/PriceIndexChart'
import { formatCOP } from '@/components/store/PriceTag'
import { priceIndexJsonLd } from '@/lib/structured-data'
import { canonical, NOINDEX_FOLLOW } from '@/lib/seo'
import { PRICE_INDEX_PATH } from '@/lib/price-index'
import { getCachedPublishedPriceIndex } from '@/lib/cache'

export const revalidate = 3600

async function loadIndex() {
  try {
    return await getCachedPublishedPriceIndex()
  } catch (e) {
    // Sin la tabla (migración sin aplicar) el sitio sigue funcionando.
    console.error('[indice] no se pudo leer el índice de precios', e)
    return null
  }
}

const formatDate = (ymd: string) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' })

const TITLE = 'Índice de Precios de Repuestos de Moto en Colombia'

export async function generateMetadata(): Promise<Metadata> {
  const index = await loadIndex()
  if (!index) return { title: TITLE, robots: NOINDEX_FOLLOW }
  return {
    title: `${TITLE} — corte ${formatDate(index.cutoffDate)}`,
    description: `Precio mediano y rango por categoría de ${index.data.productCount} referencias de repuestos de moto, con metodología y fecha de corte. Datos de H2R Online Store.`,
    alternates: canonical(PRICE_INDEX_PATH),
    robots: { index: true, follow: true },
  }
}

export default async function PriceIndexPage() {
  const index = await loadIndex()
  if (!index) notFound()

  const { data } = index
  const changes = comparePriceIndexes(data, index.previous?.data ?? null)
  const [highest] = data.categories
  const lowest = data.categories[data.categories.length - 1]
  const covered = data.categories.reduce((sum, c) => sum + c.count, 0)

  return (
    <div className="min-h-screen bg-white">
      <JsonLd
        data={priceIndexJsonLd({
          cutoffDate: index.cutoffDate,
          publishedAt: index.publishedAt,
          productCount: data.productCount,
          categoryNames: data.categories.map((c) => c.name),
        })}
      />
      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Guías', href: '/guias' }, { label: 'Índice de Precios' }]} />

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-600">Datos</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">{TITLE}</h1>
          <p className="mt-3 text-sm text-gray-500">
            Corte del <time dateTime={index.cutoffDate}>{formatDate(index.cutoffDate)}</time> · {data.productCount} referencias ·
            Metodología v{data.methodologyVersion}
          </p>
          {highest && lowest && (
            <p className="mt-6 rounded-2xl bg-sky-50 p-5 text-lg leading-relaxed text-gray-800">
              Al {formatDate(index.cutoffDate)}, en el catálogo de H2R la categoría con el precio mediano más alto es{' '}
              {highest.name} ({formatCOP(highest.median)}) y la más baja es {lowest.name} ({formatCOP(lowest.median)}). El índice
              resume {covered} referencias en {data.categories.length} categorías con al menos {data.minSample} productos cada
              una, con la mediana y el rango en el que está la mitad central de los precios.
            </p>
          )}
        </header>

        <section className="mt-10" aria-labelledby="grafico">
          <h2 id="grafico" className="text-2xl font-bold text-gray-900">¿Cuánto cuesta cada tipo de repuesto?</h2>
          <PriceIndexChart categories={data.categories} />
        </section>

        <section className="mt-10" aria-labelledby="tabla">
          <h2 id="tabla" className="text-2xl font-bold text-gray-900">Datos completos por categoría</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Precios por categoría, corte del {formatDate(index.cutoffDate)}</caption>
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Categoría</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Referencias</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Mediana</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">P25 – P75</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Mín. – Máx.</th>
                  {changes.size > 0 && <th scope="col" className="px-4 py-3 text-right font-semibold">vs. corte anterior</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 tabular-nums">
                {data.categories.map((c) => {
                  const change = changes.get(c.slug)
                  return (
                    <tr key={c.slug}>
                      <th scope="row" className="px-4 py-3 font-semibold text-gray-900">
                        <Link href={`/catalogo?category=${c.slug}`} className="hover:underline">{c.name}</Link>
                        {c.parentName && <span className="block text-xs font-normal text-gray-500">{c.parentName}</span>}
                      </th>
                      <td className="px-4 py-3 text-right text-gray-700">{c.count}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCOP(c.median)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCOP(c.p25)} – {formatCOP(c.p75)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCOP(c.min)} – {formatCOP(c.max)}</td>
                      {changes.size > 0 && (
                        <td className="px-4 py-3 text-right text-gray-700">
                          {change === undefined ? '—' : `${change > 0 ? '+' : ''}${change.toLocaleString('es-CO')} %`}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {data.insufficient.length > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              Sin muestra suficiente (menos de {data.minSample} referencias), no incluidas:{' '}
              {data.insufficient.map((i) => `${i.name} (${i.count})`).join(', ')}.
            </p>
          )}
        </section>

        <section className="mt-10" aria-labelledby="metodologia">
          <h2 id="metodologia" className="text-2xl font-bold text-gray-900">¿Cómo se calcula este índice?</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-gray-700">
            <li>
              <strong>Fuente:</strong> el catálogo de H2R Online Store el día del corte. Son precios de venta al público de H2R, en
              pesos colombianos con IVA; <strong>no</strong> son un promedio del mercado colombiano.
            </li>
            <li>
              <strong>Qué entra:</strong> todos los productos activos y con precio publicado ese día ({data.productCount}{' '}
              referencias), agrupados por la categoría en la que están catalogados. Las subcategorías que son marcas (por
              ejemplo, una marca de aceite o de llantas) se suman a su categoría: el índice compara tipos de repuesto, no marcas.
            </li>
            <li>
              <strong>Qué se calcula:</strong> por categoría, la mediana (la mitad de los productos cuesta menos y la otra mitad
              más), los percentiles 25 y 75 (entre ellos está la mitad central de los precios), el mínimo y el máximo. Los
              percentiles usan interpolación lineal.
            </li>
            <li>
              <strong>Muestra mínima:</strong> solo se publica una categoría con {data.minSample} o más referencias; con menos, una
              mediana no dice nada.
            </li>
            <li>
              <strong>Actualización:</strong> un corte por semestre. Cada corte es una foto fija: las cifras publicadas no cambian
              aunque cambien los precios. La variación se compara solo contra cortes con la misma metodología
              {index.previous ? ` (corte anterior: ${formatDate(index.previous.cutoffDate)})` : ''}.
            </li>
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            Puedes citar estos datos indicando la fuente: &ldquo;Índice de Precios de Repuestos de Moto, H2R Online Store, corte
            del {formatDate(index.cutoffDate)}&rdquo;, con enlace a esta página.
          </p>
        </section>

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-gray-100 pt-6 text-sm">
          <Link href="/repuestos" className="font-semibold text-sky-600 hover:text-sky-700">Repuestos por moto →</Link>
          <Link href="/guias" className="text-gray-600 underline hover:text-gray-800">Guías de mantenimiento</Link>
        </div>
      </article>
    </div>
  )
}
