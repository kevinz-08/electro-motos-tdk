'use client'

/**
 * Botón "Agregar al carrito".
 * Si el producto está agotado, renderiza un botón deshabilitado en su lugar.
 * Llama a `useCart().addItem` del store de Zustand — actualiza localStorage automáticamente.
 */
import { Product } from '@/domain/entities/Product'
import { useCart } from '@/lib/cart'

interface AddToCartButtonProps {
  product: Product
  quantity?: number
  className?: string
}

export function AddToCartButton({ product, quantity = 1, className }: AddToCartButtonProps) {
  const { addItem } = useCart()

  if (product.stock === 0) {
    return (
      <button
        disabled
        className="w-full mt-3 bg-gray-100 text-gray-400 py-2 px-4 rounded-lg text-sm font-medium cursor-not-allowed"
      >
        Agotado
      </button>
    )
  }

  return (
    <button
      onClick={() => addItem(product, quantity)}
      className={
        className ??
        'w-full mt-3 bg-amber-400 text-gray-900 py-2 px-4 rounded-lg text-sm font-bold hover:bg-amber-300 active:scale-95 transition-all'
      }
    >
      Agregar al carrito
    </button>
  )
}
