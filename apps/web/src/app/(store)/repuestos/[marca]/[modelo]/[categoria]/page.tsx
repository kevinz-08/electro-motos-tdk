/**
 * Listado de una categoría para un modelo — `/repuestos/[marca]/[modelo]/[categoria]`.
 *
 * Ej: `/repuestos/akt/nkd-125/frenos` → "Frenos para AKT NKD 125".
 * Es la URL que compite por las búsquedas "[repuesto] [modelo]", que es como
 * busca el comprador de repuestos en Colombia.
 *
 * Igual que el hub (docs/seo/, Fase 2):
 *   - Solo existe si hay productos compatibles **verificados** de esa categoría
 *     para ese modelo. Si no, 404 — nada de listados vacíos indexables.
 *   - Los productos salen de fitments con `verified = true`.
 *   - El `ItemList` de JSON-LD refleja exactamente los productos que se ven.
 *
 * Render: Server Component con ISR de 10 min.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { fullModelName } from '@h2r/domain'
import { ProductCard } from '@/components/store/ProductCard'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { WHATSAPP_URL } from '@/lib/contact'
import { getCachedModelHub, getCachedProductIdsByModel, getCachedPublishableModels } from '@/lib/cache'
import { getProductsByIds } from '@/lib/queries/fitment'
import { absoluteUrl, canonical } from '@/lib/seo'

export const revalidate = 600

interface PageProps {
  params: Promise<{ marca: string; modelo: string; categoria: string }>
}

/**
 * Prerenderiza cada par modelo × categoría que ya tiene productos verificados.
 * Se apoya en el hub, que ya calcula los conteos por categoría.
 */
export async function generateStaticParams() {
  const models = await getCachedPublishableModels()

  const params: { marca: string; modelo: string; categoria: string }[] = []
  for (const model of models) {
    const hub = await getCachedModelHub(model.brand.slug, model.slug)
    if (!hub.ok) continue
    for (const category of hub.value.categories) {
      if (category.productCount > 0) {
        params.push({ marca: model.brand.slug, modelo: model.slug, categoria: category.categorySlug })
      }
    }
  }
  return params
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marca, modelo, categoria } = await params
  const result = await getCachedModelHub(marca, modelo, categoria)

  if (!result.ok) return { title: 'Página no encontrada' }

  const { model, categories } = result.value
  const category = categories.find((c) => c.categorySlug === categoria)
  const name = fullModelName(model)

  return {
    // Fórmula del brief para modelo × categoría.
    title: `${category?.categoryName ?? 'Repuestos'} para ${name} | Envío a toda Colombia`,
    description:
      `${category?.productCount ?? 0} ${(category?.categoryName ?? 'repuestos').toLowerCase()} ` +
      `compatibles con ${name}, con compatibilidad verificada. Envío a toda Colombia.`,
    alternates: canonical(`/repuestos/${marca}/${modelo}/${categoria}`),
    robots: { index: true, follow: true },
  }
}

export default async function ModelCategoryPage({ params }: PageProps) {
  const { marca, modelo, categoria } = await params
  const result = await getCachedModelHub(marca, modelo, categoria)

  // NOT_FOUND cubre: modelo inexistente, modelo sin repuestos verificados y
  // categoría sin productos para ese modelo.
  if (!result.ok) notFound()

  const { model, categories } = result.value
  const category = categories.find((c) => c.categorySlug === categoria)
  if (!category) notFound()

  const name = fullModelName(model)
  const productIds = await getCachedProductIdsByModel(model.id, category.categoryId)
  const products = await getProductsByIds(productIds)

  // Un listado sin productos no debería llegar aquí (el hub ya lo filtra), pero
  // si la caché del hub va por delante del catálogo, se responde 404 igual.
  if (products.length === 0) notFound()

  // ItemList: refleja exactamente los productos visibles, en el mismo orden.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.categoryName} para ${name}`,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(`/producto/${product.slug}`),
      name: product.name,
    })),
  }

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Repuestos', href: '/catalogo' },
            { label: model.brand.name },
            { label: model.name, href: `/repuestos/${marca}/${modelo}` },
            { label: category.categoryName },
          ]}
        />

        <header className="mt-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            {category.categoryName} para {name}
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            {products.length}{' '}
            {products.length === 1 ? 'repuesto compatible verificado' : 'repuestos compatibles verificados'}
            {model.cc !== null && ` · ${model.cc} cc`}
          </p>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Otras categorías del mismo modelo: enlazado interno entre hermanos,
            para que ninguna quede a más de un clic de esta. */}
        {categories.length > 1 && (
          <section className="mt-14 border-t border-gray-100 pt-8">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Más repuestos para tu {model.name}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {categories
                .filter((c) => c.categorySlug !== categoria && c.productCount > 0)
                .map((c) => (
                  <li key={c.categoryId}>
                    <Link
                      href={`/repuestos/${marca}/${modelo}/${c.categorySlug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:border-sky-300 hover:bg-sky-50/40 transition-colors"
                    >
                      {c.categoryName}
                      <span className="text-gray-400 tabular-nums">{c.productCount}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <p className="mt-10 text-xs text-gray-400">
          ¿No encuentras lo que buscas para tu {model.name}?{' '}
          <a
            href={WHATSAPP_URL(`Hola H2R, busco ${category.categoryName.toLowerCase()} para mi ${name}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 underline hover:text-sky-700"
          >
            Pregúntanos por WhatsApp
          </a>
          .
        </p>
      </div>
    </div>
  )
}
