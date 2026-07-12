'use client'

import { useState } from 'react'
import { Product } from '@h2r/domain'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart'

interface AddToCartWithQuantityProps {
  product: Product
}

export function AddToCartWithQuantity({ product }: AddToCartWithQuantityProps) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)

  if (product.stock === 0) {
    return (
      <button
        disabled
        className="w-full c-surface-2 border c-border c-text-4 py-2.5 px-4 rounded-xl text-sm font-medium cursor-not-allowed"
      >
        Agotado
      </button>
    )
  }

  const maxQuantity = Math.min(product.stock, 99)

  const handleAdd = () => {
    addItem(product, quantity)
    toast.success('Agregado al carrito', { description: product.name })
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center border border-gray-200 rounded-full overflow-hidden shrink-0">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          aria-label="Disminuir cantidad"
          className="w-9 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-semibold text-gray-900">
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
          disabled={quantity >= maxQuantity}
          aria-label="Aumentar cantidad"
          className="w-9 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          +
        </button>
      </div>

      <button
        onClick={handleAdd}
        className="flex-1 bg-sky-400 text-black py-3 px-6 rounded-xl text-base font-bold hover:bg-sky-500 hover:text-white active:scale-95 transition-all"
      >
        Agregar al carrito
      </button>
    </div>
  )
}
