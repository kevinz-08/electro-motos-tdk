'use client'

/**
 * Página del carrito de compras.
 *
 * Es un Client Component porque lee el carrito desde Zustand (localStorage).
 * No puede ser Server Component porque el carrito solo existe en el navegador.
 *
 * Layout de la página:
 *   - Si el carrito está vacío: mensaje con link al catálogo
 *   - Si tiene ítems:
 *     - Columna izquierda (2/3): lista de ítems con imagen, nombre, SKU, precio total
 *       - Controles de cantidad: − [N] + (máximo: stock del producto)
 *       - Botón X para eliminar el ítem
 *       - Link "Vaciar carrito"
 *     - Columna derecha (1/3, sticky): resumen del pedido
 *       - Listado de ítems con precio × cantidad
 *       - Total en COP
 *       - Botón "Finalizar pedido →" → va a /checkout
 *
 * El botón + no puede superar el stock disponible del producto.
 * Esto se controla en useCart().updateQuantity con Math.min.
 */
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/cart'

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6">🛒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Tu carrito está vacío</h1>
        <p className="text-gray-500 mb-8">Agrega productos desde el catálogo para continuar.</p>
        <Link
          href="/catalogo"
          className="bg-amber-400 text-gray-900 px-8 py-3 rounded-lg font-bold hover:bg-amber-300 transition-colors"
        >
          Ver catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Tu carrito</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ítems */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(({ product, quantity }) => (
            <div
              key={product.id}
              className="flex gap-4 bg-white border border-gray-200 rounded-xl p-4"
            >
              <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                {product.images[0] ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300 text-2xl">
                    📦
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <Link href={`/producto/${product.slug}`}>
                  <h3 className="text-sm font-semibold text-gray-900 hover:text-amber-600 line-clamp-2">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">SKU: {product.sku}</p>
                <p className="text-base font-bold text-gray-900 mt-2">
                  {formatCOP(product.price * quantity)}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  onClick={() => removeItem(product.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(product.id, quantity - 1)}
                    className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:border-amber-400 text-gray-600"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                  <button
                    onClick={() =>
                      updateQuantity(product.id, Math.min(quantity + 1, product.stock))
                    }
                    className="w-7 h-7 rounded border border-gray-200 flex items-center justify-center hover:border-amber-400 text-gray-600"
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={clearCart}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            Vaciar carrito
          </button>
        </div>

        {/* Resumen */}
        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-24">
            <h2 className="font-bold text-gray-900 mb-4">Resumen del pedido</h2>

            <div className="space-y-2 mb-4">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex justify-between text-sm text-gray-600">
                  <span className="line-clamp-1 flex-1">{product.name} ×{quantity}</span>
                  <span className="shrink-0 ml-2">{formatCOP(product.price * quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 mb-6">
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCOP(total())}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Envío calculado al finalizar</p>
            </div>

            <Link
              href="/checkout"
              className="block w-full bg-amber-400 text-gray-900 py-3 px-6 rounded-xl font-bold text-center hover:bg-amber-300 active:scale-95 transition-all"
            >
              Finalizar pedido →
            </Link>

            <p className="text-xs text-gray-400 text-center mt-3">
              🔒 Pago seguro con Wompi
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
