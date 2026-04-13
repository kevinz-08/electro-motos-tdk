'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
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
  const [showConfirm, setShowConfirm] = useState(false)

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6">🛒</div>
        <h1 className="text-2xl font-bold text-white mb-3">Tu carrito está vacío</h1>
        <p className="text-white/50 mb-8">Agrega productos desde el catálogo para continuar.</p>
        <Link
          href="/catalogo"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-500 transition-colors"
        >
          Ver catálogo
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Modal de confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-4">🗑️</div>
            <h2 className="text-xl font-bold text-white mb-2">¿Vaciar el carrito?</h2>
            <p className="text-white/50 text-sm mb-6">
              Se eliminarán todos los productos. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 border border-white/20 text-white py-2.5 rounded-lg font-semibold hover:border-white/40 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => { clearCart(); setShowConfirm(false) }}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-500 transition-colors"
              >
                Vaciar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-white mb-8">Tu carrito</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ítems */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="flex gap-4 bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div className="relative w-20 h-20 bg-white/10 rounded-lg overflow-hidden shrink-0">
                  {product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-white/30 text-2xl">
                      📦
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Link href={`/producto/${product.slug}`}>
                    <h3 className="text-sm font-semibold text-white hover:text-blue-400 line-clamp-2 transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-xs text-white/40 mt-0.5">SKU: {product.sku}</p>
                  <p className="text-base font-bold text-white mt-2">
                    {formatCOP(product.price * quantity)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => removeItem(product.id)}
                    className="text-white/30 hover:text-red-500 transition-colors"
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
                      className="w-7 h-7 rounded border border-white/20 flex items-center justify-center hover:border-blue-400 text-white transition-colors"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-white">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(product.id, Math.min(quantity + 1, product.stock))}
                      className="w-7 h-7 rounded border border-white/20 flex items-center justify-center hover:border-blue-400 text-white transition-colors"
                      disabled={quantity >= product.stock}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setShowConfirm(true)}
              className="text-sm text-white/30 hover:text-red-500 transition-colors"
            >
              Vaciar carrito
            </button>
          </div>

          {/* Resumen */}
          <div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 sticky top-24">
              <h2 className="font-bold text-white mb-4">Resumen del pedido</h2>

              <div className="space-y-2 mb-4">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-sm text-white/60">
                    <span className="line-clamp-1 flex-1">{product.name} ×{quantity}</span>
                    <span className="shrink-0 ml-2">{formatCOP(product.price * quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4 mb-6">
                <div className="flex justify-between font-bold text-white">
                  <span>Total</span>
                  <span>{formatCOP(total())}</span>
                </div>
                <p className="text-xs text-white/30 mt-1">Envío calculado al finalizar</p>
              </div>

              <Link
                href="/checkout"
                className="block w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-bold text-center hover:bg-blue-500 active:scale-95 transition-all"
              >
                Finalizar pedido →
              </Link>

              <p className="text-xs text-white/30 text-center mt-3">
                🔒 Pago seguro con Wompi
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
