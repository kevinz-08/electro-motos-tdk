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
 *   - Imagen principal (o placeholder si no tiene imágenes)
 *   - SKU del producto
 *   - Nombre y precio formateado en COP
 *   - Indicador de stock: verde (en stock), amarillo (pocas unidades), rojo (agotado)
 *   - AddToCartButton (Client Component — necesita acceder al store de Zustand)
 *   - Descripción completa del producto
 *   - Badges de compatibilidad con modelos de motos
 *
 * El badge de stock usa estos umbrales:
 *   stock === 0   → "Agotado" (rojo) + botón deshabilitado
 *   1-5 unidades  → "¡Solo N disponibles!" (amarillo) — urgencia de compra
 *   6+ unidades   → "En stock (N unidades)" (verde)
 */
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { GetProductBySlug } from '@/domain/use-cases/products/GetProductBySlug'
import { AddToCartButton } from '@/components/store/AddToCartButton'
import { cloudinaryUrl } from '@/lib/cloudinary'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const repo = new PrismaProductRepository()
  const result = await new GetProductBySlug(repo).execute(slug)
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
  const repo = new PrismaProductRepository()
  const result = await new GetProductBySlug(repo).execute(slug)

  if (!result.ok) notFound()

  const product = result.value
  const mainImage = cloudinaryUrl(product.images[0], 'detail')

  return (
    <div className="min-h-screen bg-white">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Imagen */}
        <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300">
              <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
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
            ) : product.stock <= 5 ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                ¡Solo {product.stock} disponibles!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                En stock ({product.stock} unidades)
              </span>
            )}
          </div>

          <AddToCartButton
            product={product}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl text-base font-bold hover:bg-blue-500 active:scale-95 transition-all mb-3"
          />

          <div className="text-sm text-gray-500 flex items-center gap-4 mt-4">
            <span>🔒 Pago seguro con Wompi</span>
            <span>🚚 Envío a todo Colombia</span>
          </div>

          <hr className="my-6 border-gray-100" />

          <div className="prose prose-sm text-gray-600">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Descripción</h3>
            <p>{product.description}</p>
          </div>

          {product.compatible && product.compatible.length > 0 && (
            <div className="mt-6">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                Compatibilidad
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.compatible.map((c) => (
                  <span
                    key={c.id}
                    className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full border border-gray-200"
                  >
                    {c.brand} {c.model}
                    {c.year ? ` (${c.year})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}
