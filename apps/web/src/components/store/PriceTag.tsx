/**
 * Precio con estrategia de precio ancla (Price Anchoring).
 *
 * Si el producto tiene un `compareAtPrice` válido (> price):
 *   - Precio de referencia tachado, pequeño y en gris (sutil).
 *   - Precio real de venta más grande y en negrita.
 *   - Badge "-X%" en el azul de la marca (sky-500) (porcentaje redondeado hacia abajo — nunca exagera el descuento).
 * Sin precio ancla, se muestra solo el precio real en el estilo neutro de siempre.
 *
 * Server-safe: no usa hooks, se puede renderizar en Server y Client Components.
 * Ver README §22.1.
 */
import { getDiscountPercent } from '@h2r/domain'

export function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

const SIZES = {
  sm: { price: 'text-base', compare: 'text-xs', badge: 'text-[10px] px-1.5 py-0.5' },
  md: { price: 'text-xl', compare: 'text-sm', badge: 'text-xs px-2 py-0.5' },
  lg: { price: 'text-4xl', compare: 'text-lg', badge: 'text-sm px-2.5 py-1' },
} as const

interface PriceTagProps {
  /** Precio real de venta en centavos COP. */
  price: number
  /** Precio de referencia en centavos COP. null/undefined = sin ancla. */
  compareAtPrice?: number | null
  size?: keyof typeof SIZES
  /** Multiplica ambos precios (ej. subtotal de una línea del carrito). */
  quantity?: number
  /** Oculta el badge -X% (útil en listados compactos). */
  hideBadge?: boolean
  className?: string
}

export function PriceTag({
  price, compareAtPrice, size = 'md', quantity = 1, hideBadge = false, className = '',
}: PriceTagProps) {
  const discount = getDiscountPercent(price, compareAtPrice)
  const s = SIZES[size]

  if (discount === 0 || !compareAtPrice) {
    return (
      <p className={`${s.price} font-bold text-gray-900 tracking-tight ${className}`}>
        {formatCOP(price * quantity)}
      </p>
    )
  }

  return (
    <div className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      <span className={`${s.price} font-bold text-gray-900 tracking-tight`}>
        {formatCOP(price * quantity)}
      </span>
      <span className={`${s.compare} text-gray-400 line-through`}>
        <span className="sr-only">Antes </span>
        {formatCOP(compareAtPrice * quantity)}
      </span>
      {!hideBadge && (
        <span className={`${s.badge} self-center rounded-full bg-sky-500 text-white font-bold leading-none`}>
          -{discount}%
        </span>
      )}
    </div>
  )
}
