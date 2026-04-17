'use client'

/**
 * Botón "Agregar al carrito".
 * Usa clases semánticas c-* para adaptarse al tema claro/oscuro del catálogo.
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
        className="w-full c-surface-2 border c-border c-text-4 py-2.5 px-4 rounded-xl text-sm font-medium cursor-not-allowed"
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
        'w-full bg-blue-600 text-white py-2.5 px-4 rounded-xl text-sm font-bold hover:bg-blue-500 active:scale-95 transition-all'
      }
    >
      Agregar al carrito
    </button>
  )
}
