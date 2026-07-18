/**
 * Página de detalle de producto.
 *
 * Ruta: /producto/[slug]
 * Ejemplo: /producto/pastillas-freno-brembo-yamaha-fz25
 *
 * Es un Server Component que obtiene el producto por su slug único.
 * Si el producto no existe o no está activo (isActive=false), Next.js
 * muestra la página 404 automáticamente via `notFound()`.
 *
 * Incluye generateMetadata para SEO dinámico:
 *   - title: nombre del producto
 *   - description: primeros 160 caracteres de la descripción
 *
 * Elementos de la página:
 *   - ProductImageGallery (Client Component): galería interactiva con
 *     hasta 4 imágenes, botones ← → y miniaturas clicables.
 *   - SKU del producto
 *   - Nombre y precio formateado en COP
 *   - Indicador de stock: verde (en stock), amarillo (pocas unidades), rojo (agotado)
 *   - AddToCartWithQuantity (Client Component — selector de cantidad + agregar al carrito,
 *     necesita acceder al store de Zustand)
 *   - Descripción completa del producto
 *   - Beneficios (editable desde el admin, texto libre)
 *   - Acordeón de Compatibilidad (editable desde el admin, texto libre — ej.
 *     "Honda CB160F 2020-2023"), Envíos y Cambios y devoluciones
 *
 * El badge de stock usa estos umbrales:
 *   stock === 0   → "Agotado" (rojo) + botón deshabilitado
 *   stock === 1   → "¡Solo 1 disponible!" (amarillo) — urgencia de compra
 *   2+ unidades   → "En stock (N unidades)" (verde)
 */
import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@h2r/database'
import { getCachedProductBySlug } from '@/lib/cache'
import { AddToCartWithQuantity } from '@/components/store/AddToCartWithQuantity'
import { PayWithAddiButton } from '@/components/store/PayWithAddiButton'
import { ProductImageGallery } from '@/components/store/ProductImageGallery'
import {
  RecommendedProducts,
  RecommendedProductsSkeleton,
} from '@/components/store/RecommendedProducts'
import type { Metadata } from 'next'

export const revalidate = 300

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { isActive: true, stock: { gt: 0 } },
    select: { slug: true },
  })
  return products.map((p) => ({ slug: p.slug }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getCachedProductBySlug(slug)
  if (!result.ok) return { title: 'Producto no encontrado' }
  return {
    title: result.value.name,
    description: result.value.description.slice(0, 160),
  }
}

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const result = await getCachedProductBySlug(slug)

  if (!result.ok) notFound()

  const product = result.value

  const [freshProduct, structuredDescription] = await Promise.all([
    prisma.product.findUnique({ where: { id: product.id }, select: { description: true } }),
    prisma.productDescription.findUnique({
      where: { productId: product.id },
      include: {
        benefits: { orderBy: { order: 'asc' } },
        compatibility: { orderBy: { order: 'asc' } },
      },
    }),
  ])
  const description =
    structuredDescription?.generalDescription ||
    freshProduct?.description ||
    product.description

  return (
    <div className="min-h-screen bg-white">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

        {/* ── Galería de imágenes (hasta 4) ── */}
        <div>
          <ProductImageGallery
            images={product.images}
            productName={product.name}
          />

          <div className="mt-6 flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg
                className="w-4 h-4 text-sky-500 shrink-0"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-12V7a4 4 0 10-8 0v4h8z" />
              </svg>
              <span>Pago seguro con Wompi</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 border-l border-gray-200 ml-4 pl-4">
              <svg
                className="w-4 h-4 text-sky-500 shrink-0"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM5 17H3V7a1 1 0 011-1h9a1 1 0 011 1v10h-2m-8 0h8m0-10l4 4h-4v-4z" />
              </svg>
              <span>Envío a todo Colombia</span>
            </div>
          </div>

          {/* Acordeón de compatibilidad, envíos y cambios */}
          <div className="mt-4 space-y-2">
            {structuredDescription && structuredDescription.compatibility.length > 0 && (
              <details className="group border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none list-none bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className="text-sm font-medium text-gray-700">
                    🏍️ Compatibilidad
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 py-3 text-xs text-gray-600 space-y-1.5 bg-white border-t border-gray-100">
                  {structuredDescription.compatibility.map((c) => (
                    <p key={c.id}>• {c.body}</p>
                  ))}
                </div>
              </details>
            )}

            <details className="group border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none list-none bg-gray-50 hover:bg-gray-100 transition-colors">
                <span className="text-sm font-medium text-gray-700">
                  📦 Envíos
                </span>
                <svg
                  className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-4 py-3 text-xs text-gray-600 space-y-1.5 bg-white border-t border-gray-100">
                <p>• Despacho en <strong>1 a 5 días hábiles</strong> desde la confirmación del pago.</p>
                <p>• Envío <strong>gratis</strong> en compras superiores a $500.000 COP.</p>
                <p>• Cobertura a <strong>todo Colombia</strong> con Coordinadora, Envía e Interrapidísimo.</p>
                <p>• Una vez despachado, no se aceptan cambios de dirección.</p>
                <Link
                  href="/legal/politica-de-envios"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-sky-600 underline hover:text-sky-700"
                >
                  Ver política completa de envíos →
                </Link>
              </div>
            </details>

            <details className="group border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none list-none bg-gray-50 hover:bg-gray-100 transition-colors">
                <span className="text-sm font-medium text-gray-700">
                  🔄 Cambios y devoluciones
                </span>
                <svg
                  className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-4 py-3 text-xs text-gray-600 space-y-1.5 bg-white border-t border-gray-100">
                <p>• Tienes <strong>5 días calendario</strong> desde la recepción para solicitar un cambio.</p>
                <p>• El producto debe estar sin uso, en su <strong>embalaje original</strong> e intacto.</p>
                <p>• El cambio se gestiona en un plazo máximo de <strong>30 días calendario</strong>.</p>
                <p>• Los reembolsos aplican únicamente por garantía o derecho de retracto.</p>
                <Link
                  href="/legal/politica-de-cambios"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-1 text-sky-600 underline hover:text-sky-700"
                >
                  Ver política completa de cambios →
                </Link>
              </div>
            </details>
          </div>
        </div>

        {/* Detalle */}
        <div>
          <p className="text-sm text-gray-400 mb-1">SKU: {product.sku}</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
          <p className="text-4xl font-bold text-gray-900 mb-6">{formatCOP(product.price)}</p>

          <div className="mb-6">
            {product.stock === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-red-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Agotado
              </span>
            ) : product.stock === 1 ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                ¡Solo 1 disponible!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                En stock ({product.stock} unidades)
              </span>
            )}
          </div>

          <AddToCartWithQuantity product={product} />

          {/*
            Alternativa de pago — abre WhatsApp con consulta pre-armada.
            Espaciador invisible del mismo ancho que el selector de cantidad
            (106px + 12px de gap) para que el botón de Addi quede exactamente
            debajo de "Agregar al carrito" — mismo ancho y misma alineación,
            en vez de centrado en toda la columna. El stepper de cantidad
            siempre se renderiza salvo cuando no hay stock (ver
            AddToCartWithQuantity), así que el espaciador sigue esa misma
            condición.
          */}
          <div className="mt-3 flex items-center gap-3">
            {product.stock > 0 && <div className="w-[106px] shrink-0" aria-hidden="true" />}
            <PayWithAddiButton
              product={product}
              className="flex-1 inline-flex items-center justify-center gap-2.5 bg-[#1A57FF] text-white py-3 px-6 rounded-xl text-base font-bold hover:bg-[#0B47E5] active:scale-95 transition-all shadow-lg shadow-[#1A57FF]/25 hover:shadow-[#1A57FF]/40"
            />
          </div>

          <hr className="mt-4 mb-3 border-gray-100" />

          {description && (
            <div className="prose prose-sm text-gray-600">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Descripción</h3>
              <p>{description}</p>
            </div>
          )}

          {structuredDescription && structuredDescription.benefits.length > 0 && (
            <div className="mt-5">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Beneficios</h3>
              <ul className="space-y-2">
                {structuredDescription.benefits.map((benefit) => (
                  <li key={benefit.id} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-sky-100 text-sky-500 flex items-center justify-center shrink-0 text-[10px] font-bold">✓</span>
                    {benefit.body}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      {/* ── Productos relacionados ── */}
      <Suspense fallback={<RecommendedProductsSkeleton />}>
        <RecommendedProducts
          categoryId={product.categoryId}
          excludeSlug={product.slug}
        />
      </Suspense>
    </div>
    </div>
  )
}
