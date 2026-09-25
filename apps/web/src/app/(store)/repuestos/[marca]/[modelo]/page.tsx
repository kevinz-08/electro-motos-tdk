/**
 * Hub de modelo de moto — `/repuestos/[marca]/[modelo]`.
 *
 * Es la página que responde a la búsqueda real del comprador colombiano:
 * "repuestos para NKD 125". Muestra el modelo, sus categorías con cuántos
 * repuestos compatibles hay en cada una, y los productos destacados.
 *
 * Reglas que la hacen legítima y no una doorway page (docs/seo/, Fase 2):
 *
 *   1. **Solo existe si hay repuestos compatibles verificados.** Sin ellos,
 *      `GetModelHub` devuelve NOT_FOUND y esta ruta responde 404. No se publica
 *      una página por modelo que solo cambia el nombre.
 *   2. **Todo lo que dice sale de la base de datos**: los conteos son reales, el
 *      cilindraje y los años solo se muestran si están confirmados, y la
 *      introducción la escribe un humano (`MotorcycleModel.intro`). Si no hay
 *      introducción, no se pone texto de relleno.
 *   3. Los productos que lista tienen fitment `verified = true` con este modelo.
 *
 * Render: Server Component con ISR de 10 min. `generateStaticParams` prerenderiza
 * los modelos que ya tienen compatibilidades verificadas.
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { formatYearRange, fullModelName } from '@h2r/domain'
import { ProductCard } from '@/components/store/ProductCard'
import { ModelCategoryGrid } from '@/components/store/ModelCategoryGrid'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { WHATSAPP_URL } from '@/lib/contact'
import {
  getCachedModelHub,
  getCachedProductIdsByModel,
  getCachedPublishableModels,
  getCachedKitsByModel,
} from '@/lib/cache'
import { KitsSection } from '@/components/store/KitsSection'
import { getProductsByIds } from '@/lib/queries/fitment'
import { canonical } from '@/lib/seo'

export const revalidate = 600

/** Cuántos productos se muestran en el hub antes de mandar al listado por categoría. */
const FEATURED_LIMIT = 8

interface PageProps {
  params: Promise<{ marca: string; modelo: string }>
}

export async function generateStaticParams() {
  const models = await getCachedPublishableModels()
  return models.map((m) => ({ marca: m.brand.slug, modelo: m.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { marca, modelo } = await params
  const result = await getCachedModelHub(marca, modelo)

  if (!result.ok) return { title: 'Modelo no encontrado' }

  const { model, totalProducts } = result.value
  const name = fullModelName(model)
  const cc = model.cc ? ` (${model.cc} cc)` : ''

  return {
    title: `Repuestos para ${name}${cc}`,
    description:
      `${totalProducts} repuestos compatibles con ${name}, con compatibilidad verificada. ` +
      `Envío a toda Colombia y pago seguro con Wompi.`,
    alternates: canonical(`/repuestos/${marca}/${modelo}`),
    robots: { index: true, follow: true },
  }
}

export default async function ModelHubPage({ params }: PageProps) {
  const { marca, modelo } = await params
  const result = await getCachedModelHub(marca, modelo)

  // NOT_FOUND cubre tanto "no existe" como "no tiene repuestos verificados".
  if (!result.ok) notFound()

  const { model, categories, totalProducts } = result.value
  const name = fullModelName(model)
  const years = formatYearRange(model)

  const productIds = await getCachedProductIdsByModel(model.id)
  const products = await getProductsByIds(productIds.slice(0, FEATURED_LIMIT))

  // Kits: complemento opcional — si la lectura falla (p. ej. migración sin
  // aplicar) el hub se sirve igual, sin esta sección.
  let kits: Awaited<ReturnType<typeof getCachedKitsByModel>> = []
  try {
    kits = await getCachedKitsByModel(model.id)
  } catch (e) {
    console.error('[kits] no se pudieron leer los kits del modelo', e)
  }

  return (
    <div className="bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Repuestos', href: '/catalogo' },
            // La marca no enlaza: la ruta /repuestos/[marca] no existe todavía y
            // no se crea hasta que haya varios modelos publicables por marca.
            { label: model.brand.name },
            { label: model.name },
          ]}
        />

        {/* ── Encabezado ───────────────────────────────────────────────── */}
        <header className="mt-6 mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Repuestos para {name}
          </h1>

          {/* Ficha técnica: solo los datos confirmados. Sin cilindraje ni años
              confirmados, no se escribe nada — nunca se estiman. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            {model.cc !== null && <span>{model.cc} cc</span>}
            {years && <span>{years}</span>}
            <span className="font-medium text-gray-700">
              {totalProducts} {totalProducts === 1 ? 'repuesto compatible' : 'repuestos compatibles'}
            </span>
          </div>

          {/* Introducción escrita por un humano. Sin ella, la página va sin
              introducción en vez de con texto genérico de relleno. */}
          {model.intro && (
            <p className="mt-5 max-w-3xl text-gray-600 leading-relaxed">{model.intro}</p>
          )}

          <p className="mt-5 text-xs text-gray-400">
            Todas las compatibilidades de esta página están verificadas por el equipo de H2R.
            ¿Dudas con tu moto?{' '}
            <a
              href={WHATSAPP_URL(`Hola H2R, tengo una ${name} y necesito confirmar un repuesto.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 underline hover:text-sky-700"
            >
              Escríbenos por WhatsApp
            </a>
            .
          </p>
        </header>

        {/* ── Categorías con conteo real ───────────────────────────────── */}
        <ModelCategoryGrid categories={categories} brandSlug={marca} modelSlug={modelo} />

        {/* ── Kits para esta moto ──────────────────────────────────────── */}
        <KitsSection kits={kits} heading={`Kits para tu ${model.name}`} className="mt-14" />

        {/* ── Productos compatibles ────────────────────────────────────── */}
        {products.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Repuestos compatibles con tu {model.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {totalProducts > products.length && categories.length > 0 && (
              <p className="mt-8 text-center text-sm text-gray-500">
                Hay {totalProducts} repuestos compatibles en total. Explora por categoría arriba.
              </p>
            )}
          </section>
        )}

        <div className="mt-14 border-t border-gray-100 pt-8">
          <Link href="/catalogo" className="text-sm text-sky-600 hover:text-sky-700">
            ← Ver el catálogo completo
          </Link>
        </div>
      </div>
    </div>
  )
}
