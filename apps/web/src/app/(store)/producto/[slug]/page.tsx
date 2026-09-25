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
 * Estructura en dos columnas (en móvil se apilan: primero la izquierda):
 *
 *   Columna izquierda — galería y confianza:
 *     1. ProductImageGallery (Client Component): imagen principal, botones ← →,
 *        paginador de puntos y miniaturas clicables (hasta 4 imágenes).
 *     2. Insignias: pago seguro con Wompi y envío a todo Colombia.
 *     3. Acordeones: Compatibilidad (si el admin la cargó), Envíos y Cambios y devoluciones.
 *
 *   Columna derecha — información y conversión, en este orden:
 *     1. SKU
 *     2. Nombre del producto
 *     3. Precio (con precio ancla tachado si aplica)
 *     4. Prueba social: estrellas/reseñas y "+X personas han comprado o recomiendan"
 *     5. Alerta de stock
 *     6. Selector de cantidad + Agregar al carrito (AddToCartWithQuantity, Client Component
 *        porque usa el store de Zustand)
 *     7. Pagar con Addi
 *     8. Estimación de entrega
 *     9. Pago 100% seguro
 *    10. Descripción y beneficios (editables desde el admin)
 *
 *   Reseñas verificadas y productos relacionados van a lo ancho, debajo de las dos columnas.
 *
 * El badge de stock usa estos umbrales:
 *   stock === 0                 → "Agotado" (rojo) + botón deshabilitado
 *   0 < stock < umbral (def. 5) → "¡Solo quedan X unidades en stock!" (ámbar) — urgencia
 *   resto                       → "En stock" (verde)
 *
 * Prueba social (README §22.3): contador de ventas reales, precio ancla, badge de pago
 * seguro bajo el botón de compra y estimación de entrega en días hábiles colombianos.
 * Los umbrales se leen de Settings (getCachedCroSettings).
 */
import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@h2r/database'
import {
  getCachedProductBySlug,
  getCachedCroSettings,
  getCachedProductReviews,
  getCachedProductFitments,
} from '@/lib/cache'
import { FitmentTable } from '@/components/store/FitmentTable'
import { Breadcrumbs } from '@/components/store/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { productJsonLd } from '@/lib/structured-data'
import { CompatibilityBadge } from '@/components/store/CompatibilityBadge'
import { StickyBuyBar } from '@/components/store/StickyBuyBar'
import { ProductShippingEstimate } from '@/components/store/ProductShippingEstimate'
import { ConfirmCompatibilityButton } from '@/components/store/ConfirmCompatibilityButton'
import { ProductTrustBlock } from '@/components/store/ProductTrustBlock'
import { CrossSellBlock } from '@/components/store/CrossSellBlock'
import { ProductKitMention } from '@/components/store/ProductKitMention'
import { TrackEvent } from '@/components/analytics/TrackEvent'
import { toGaItem, toPesos } from '@/lib/analytics'

import { AddToCartWithQuantity } from '@/components/store/AddToCartWithQuantity'
import { PayWithAddiButton } from '@/components/store/PayWithAddiButton'
import { ProductImageGallery } from '@/components/store/ProductImageGallery'
import { PriceTag, formatCOP } from '@/components/store/PriceTag'
import { canonical, NOINDEX_FOLLOW } from '@/lib/seo'
import { DeliveryEstimate } from '@/components/store/DeliveryEstimate'
import {
  SoldCountBadge,
  StockStatus,
  SecurePaymentBadge,
  RatingSummaryRow,
  StarRating,
} from '@/components/store/ProductTrustSignals'
import { cloudinaryUrl } from '@/lib/cloudinary'
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

/**
 * Metadata de la ficha de producto (Fase 1 del proyecto SEO, docs/seo/).
 *
 * Antes era el nombre del producto y un corte a 160 caracteres de la
 * descripción comercial. Ahora la descripción lleva los tres datos que el
 * comprador busca en el resultado de Google — **precio real, envío y medio de
 * pago** — y la página declara su canonical absoluto.
 *
 * El tiempo de despacho sale de `Settings` (`getCachedCroSettings`), el mismo
 * dato que se muestra en la página: nunca un número inventado. No se menciona
 * el pago contra entrega porque el admin puede desactivarlo.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getCachedProductBySlug(slug)
  if (!result.ok) return { title: 'Producto no encontrado', robots: NOINDEX_FOLLOW }

  const product = result.value
  const cro = await getCachedCroSettings()
  const price = formatCOP(product.price)
  const eta = `${cro.shippingEtaMinDays} a ${cro.shippingEtaMaxDays} días hábiles`

  const description =
    `${product.name} por ${price}. Envío a toda Colombia en ${eta}. ` +
    `Pago seguro con Wompi: PSE, Nequi y tarjetas.`

  return {
    title: product.name,
    description,
    alternates: canonical(`/producto/${product.slug}`),
    // El producto sin stock sigue siendo indexable: la URL responde 200 y su
    // JSON-LD declara OutOfStock. Sacarla del índice solo perdería señales.
    robots: { index: product.isActive, follow: true },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const result = await getCachedProductBySlug(slug)

  if (!result.ok) notFound()

  const product = result.value

  const [freshProduct, structuredDescription, croSettings, reviews, compatibility] = await Promise.all([
    prisma.product.findUnique({
      where: { id: product.id },
      select: {
        description: true,
        // Campos de la Fase 2 que alimentan el JSON-LD: la entidad de dominio
        // `Product` no los lleva, así que se leen aquí.
        mpn: true,
        partBrand: true,
        warrantyMonths: true,
        // Para las migas: la categoría del producto, con su padre si lo tiene.
        category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } },
      },
    }),
    prisma.productDescription.findUnique({
      where: { productId: product.id },
      include: {
        benefits: { orderBy: { order: 'asc' } },
        compatibility: { orderBy: { order: 'asc' } },
      },
    }),
    getCachedCroSettings(),
    getCachedProductReviews(product.id),
    getCachedProductFitments(product.id),
  ])

  // Modelos compatibles verificados, reducidos a lo que el badge necesita
  // comparar. El badge es un Client Component: lee la cookie en el navegador
  // para que esta ficha siga siendo estática (ver lib/my-motorcycle.ts).
  const compatibleModels = compatibility.fitments.map((f) => ({
    brandSlug: f.model.brand.slug,
    modelSlug: f.model.slug,
    yearFrom: f.yearFrom,
    yearTo: f.yearTo,
  }))
  const showReviews = reviews.summary !== null && reviews.summary.count >= croSettings.reviewsMinCount

  // Migas: se usa la categoría padre si existe, que es la que tiene URL propia
  // en el catálogo; si el producto cuelga de una raíz, se usa esa.
  const categoryTrail = freshProduct?.category?.parent ?? freshProduct?.category ?? null

  const description =
    structuredDescription?.generalDescription ||
    freshProduct?.description ||
    product.description

  // ── Datos estructurados (docs/seo/, Fase 3) ────────────────────────────────
  //
  // El JSON-LD lo construye `productJsonLd()`, que además del precio y el stock
  // declara para qué motos sirve el repuesto (`isAccessoryOrSparePartFor`) a
  // partir de las compatibilidades VERIFICADAS. Eso es lo que permite que un
  // motor generativo responda "¿qué le sirve a una XR190L?".
  //
  // `mpn` y `brand` salen de los campos del producto y se omiten si están
  // vacíos; la ventana de entrega sale de Settings, el mismo dato que se muestra
  // en la página. Nada se rellena con valores plausibles.
  const jsonLd = productJsonLd({
    product: {
      ...product,
      mpn: freshProduct?.mpn ?? null,
      partBrand: freshProduct?.partBrand ?? null,
      warrantyMonths: freshProduct?.warrantyMonths ?? null,
    },
    description,
    images: product.images.map((img) => cloudinaryUrl(img, 'detail')),
    fitments: compatibility.fitments,
    oemReferences: compatibility.oemReferences,
    rating: showReviews && reviews.summary ? reviews.summary : null,
    deliveryDays: { min: croSettings.shippingEtaMinDays, max: croSettings.shippingEtaMaxDays },
  })

  const breadcrumbs = [
    { label: 'Inicio', href: '/' },
    { label: 'Repuestos', href: '/catalogo' },
    ...(categoryTrail ? [{ label: categoryTrail.name, href: `/catalogo?category=${categoryTrail.slug}` }] : []),
    { label: product.name },
  ]

  return (
    <div className="min-h-screen bg-white">
    <JsonLd data={jsonLd} />
    <TrackEvent
      name="view_item"
      params={{ currency: 'COP', value: toPesos(product.price), items: [toGaItem(product)] }}
    />
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Migas visibles + BreadcrumbList, generados del mismo array (Fase 3) */}
      <div className="mb-6">
        <Breadcrumbs items={breadcrumbs} />
      </div>

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
                {croSettings.freeShippingThreshold > 0 && (
                  <p>• Envío <strong>gratis</strong> en compras superiores a {formatCOP(croSettings.freeShippingThreshold)} COP.</p>
                )}
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
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.name}</h1>

          <PriceTag
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            size="lg"
            className="mb-3"
          />

          {/* Prueba social bajo el precio — solo con datos reales que superen el umbral */}
          <div className="space-y-1.5 mb-3 empty:hidden">
            <RatingSummaryRow summary={reviews.summary} minCount={croSettings.reviewsMinCount} />
            <SoldCountBadge
              soldCount={product.soldCount ?? 0}
              storeRecommendations={product.storeRecommendations ?? 0}
              minSold={croSettings.socialProofMinSold}
            />
          </div>

          {/* Badge de compatibilidad — justo encima del stock, donde el comprador
              decide. Solo aparece si hay moto seleccionada. */}
          <CompatibilityBadge
            compatibleModels={compatibleModels}
            productName={product.name}
            productSku={product.sku}
            className="mb-3"
          />

          <div className="mb-6">
            <StockStatus stock={product.stock} urgencyThreshold={croSettings.lowStockThreshold} />
          </div>

          {/* id="buy-box": el StickyBuyBar (móvil) observa este bloque */}
          <div id="buy-box">
            <AddToCartWithQuantity product={product} />
          </div>

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

          {/* Confirmar compatibilidad con un asesor, junto a la acción de compra */}
          <ConfirmCompatibilityButton
            productName={product.name}
            productSku={product.sku}
            className="mt-3"
          />

          {/* Estimación de entrega — justo debajo de las acciones de compra (carrito + Addi) */}
          {product.stock > 0 && (
            <div className="mt-4">
              <DeliveryEstimate
                minDays={croSettings.shippingEtaMinDays}
                maxDays={croSettings.shippingEtaMaxDays}
                cutoffHour={croSettings.shippingCutoffHour}
              />
            </div>
          )}

          {/* Costo de envío a la ciudad del comprador (cotizador real de Vendelo) */}
          {product.stock > 0 && (
            <ProductShippingEstimate
              productId={product.id}
              price={product.price}
              freeShippingThreshold={croSettings.freeShippingThreshold}
              className="mt-4"
            />
          )}

          <SecurePaymentBadge />

          <ProductTrustBlock warrantyMonths={freshProduct?.warrantyMonths ?? null} className="mt-3" />

          {/* Venta cruzada: sugerencias cargadas por el admin (no se muestra si no hay ninguna visible) */}
          <CrossSellBlock productId={product.id} className="mt-5" />

          {/* "Este producto está en el Kit…" — no se muestra si no hay ninguno */}
          <ProductKitMention productId={product.id} className="mt-3" />

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
      {/* ── Compatibilidad verificada y referencias OEM (docs/seo/ Fase 2) ── */}
      <FitmentTable
        fitments={compatibility.fitments}
        oemReferences={compatibility.oemReferences}
        productName={product.name}
        productSku={product.sku}
      />

      {/* ── Reseñas verificadas (README §22.6) ── */}
      {showReviews && reviews.summary && (
        <section id="resenas" className="mt-16 border-t border-gray-100 pt-10 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Opiniones de compradores</h2>
              <p className="text-sm text-gray-500 mt-1">Solo clientes que compraron y recibieron este producto.</p>
            </div>
            <div className="flex items-center gap-2">
              <StarRating average={reviews.summary.average} />
              <span className="text-lg font-bold text-gray-900">{reviews.summary.average.toFixed(1)}</span>
              <span className="text-sm text-gray-500">de 5 · {reviews.summary.count} reseñas</span>
            </div>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.latest.map((r) => (
              <li key={r.id} className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <StarRating average={r.rating} />
                  <time className="text-xs text-gray-400" dateTime={r.createdAt}>
                    {new Date(r.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </time>
                </div>
                {r.comment && <p className="text-sm text-gray-700 leading-relaxed">{r.comment}</p>}
                {r.installedLine && (
                  <p className="mt-2 text-xs font-medium text-green-700">🏍️ {r.installedLine}</p>
                )}
                <p className="text-xs text-gray-500 mt-3">
                  <span className="font-semibold text-gray-700">{r.authorName}</span>
                  {' '}· Compra verificada{r.recommends && ' · Lo recomienda'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Productos relacionados ── */}
      <Suspense fallback={<RecommendedProductsSkeleton />}>
        <RecommendedProducts
          categoryId={product.categoryId}
          excludeSlug={product.slug}
        />
      </Suspense>
    </div>

    {/* Barra fija de compra en móvil: aparece al pasar el bloque de compra */}
    <StickyBuyBar product={product} targetId="buy-box" />
    </div>
  )
}
