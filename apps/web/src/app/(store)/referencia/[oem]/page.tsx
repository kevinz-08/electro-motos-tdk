/**
 * Búsqueda por referencia original del fabricante — `/referencia/[oem]`.
 *
 * Mucha gente del gremio no busca "pastillas de freno": busca el número que
 * trae impreso la pieza vieja, "5VL-F5121-00". Esta ruta convierte esa búsqueda
 * en una página.
 *
 * Reglas (docs/seo/, Fase 2):
 *   - La referencia se normaliza, así que `/referencia/5vl-f5121-00` y
 *     `/referencia/5VLF512100` llevan al mismo sitio.
 *   - **Si ninguna referencia coincide, 404.** Si no, cada cadena que alguien
 *     teclee generaría una URL indexable vacía.
 *   - `noindex, follow`: son páginas útiles para el usuario, pero su contenido
 *     es el mismo catálogo visto de otra forma. Se indexan las fichas, no esto.
 *
 * Es dinámica a propósito: no tiene sentido prerenderizar un espacio de
 * referencias que no se conoce de antemano.
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { normalizeOemReference } from '@h2r/domain'
import { ProductCard } from '@/components/store/ProductCard'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { getCachedOemSearch } from '@/lib/cache'
import { getProductsByIds } from '@/lib/queries/fitment'
import { NOINDEX_FOLLOW } from '@/lib/seo'

interface PageProps {
  params: Promise<{ oem: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { oem } = await params
  const reference = decodeURIComponent(oem)

  return {
    title: `Repuestos con referencia ${reference.toUpperCase()}`,
    description: `Productos del catálogo de H2R que corresponden a la referencia original ${reference.toUpperCase()}.`,
    robots: NOINDEX_FOLLOW,
  }
}

export default async function OemReferencePage({ params }: PageProps) {
  const { oem } = await params
  const reference = decodeURIComponent(oem)
  const result = await getCachedOemSearch(reference)

  // Referencia corta, inexistente o sin productos asociados: 404.
  if (!result.ok) notFound()

  const products = await getProductsByIds(result.value.productIds)
  if (products.length === 0) notFound()

  return (
    <div className="bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Repuestos', href: '/catalogo' },
            { label: `Referencia ${reference.toUpperCase()}` },
          ]}
        />

        <header className="mt-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Referencia {reference.toUpperCase()}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {products.length === 1
              ? '1 producto del catálogo corresponde a esta referencia original.'
              : `${products.length} productos del catálogo corresponden a esta referencia original.`}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Buscado como <code className="font-mono">{normalizeOemReference(reference)}</code>
          </p>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  )
}
