/**
 * Tarjeta de producto para el catálogo y la home.
 *
 * Comportamiento por estado de stock:
 *  - stock = 0         → overlay "Agotado" + botón deshabilitado
 *  - 1 ≤ stock ≤ 5    → aviso de bajo stock en amarillo
 *  - stock > 5         → sin aviso especial
 *
 * El precio se formatea con Intl.NumberFormat en pesos COP (los datos son centavos).
 */
import Link from 'next/link'
import Image from 'next/image'
import { Product } from '@/domain/entities/Product'
import { AddToCartButton } from './AddToCartButton'

interface ProductCardProps {
  product: Product
}

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export function ProductCard({ product }: ProductCardProps) {
  const mainImage = product.images[0]
  const isLowStock = product.stock > 0 && product.stock <= 5

  return (
    <div className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-amber-300 transition-all duration-200">
      <Link href={`/producto/${product.slug}`}>
        <div className="relative aspect-square bg-gray-100 overflow-hidden">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                Agotado
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/producto/${product.slug}`}>
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-amber-600 transition-colors mb-1">
            {product.name}
          </h3>
        </Link>

        <p className="text-xs text-gray-400 mb-2">SKU: {product.sku}</p>

        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-lg font-bold text-gray-900">{formatCOP(product.price)}</p>
            {isLowStock && (
              <p className="text-xs text-amber-600 font-medium">¡Solo {product.stock} disponibles!</p>
            )}
          </div>
        </div>

        <AddToCartButton product={product} />
      </div>
    </div>
  )
}
