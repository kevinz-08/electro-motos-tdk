'use client'

/**
 * Estimador de envío por ciudad en la ficha (Fase 4, ítem 2).
 *
 * Reutiliza el cotizador real del carrito (`useShippingQuote` → Vendelo) y la
 * misma ciudad guardada en el carrito (`selectedCity`): si el comprador ya la
 * eligió, aquí aparece resuelta. Cotiza 1 unidad; el total definitivo se ve en
 * el carrito. Es informativo: un fallo nunca bloquea la compra, solo muestra un
 * texto neutro.
 */
import { CitySelector } from '@/components/checkout/CitySelector'
import { useCart } from '@/lib/cart'
import { useShippingQuote } from '@/lib/shipping-quote'
import { formatCOP } from '@/components/store/PriceTag'

export function ProductShippingEstimate({
  productId,
  price,
  freeShippingThreshold,
  className = '',
}: {
  productId: string
  /** Precio unitario en centavos: se compara con el umbral de envío gratis. */
  price: number
  freeShippingThreshold: number
  className?: string
}) {
  const { selectedCity, setSelectedCity } = useCart()
  const { quote, loading, error } = useShippingQuote(selectedCity, [{ productId, quantity: 1 }])

  const freeByThreshold = freeShippingThreshold > 0 && price >= freeShippingThreshold

  return (
    <div className={`rounded-xl border border-gray-200 p-4 ${className}`}>
      <p className="text-sm font-semibold text-gray-800 mb-2">¿Cuánto cuesta el envío a tu ciudad?</p>
      <CitySelector value={selectedCity} onChange={setSelectedCity} />

      <div className="mt-2 min-h-5 text-sm" aria-live="polite">
        {selectedCity && loading && <span className="text-gray-400">Calculando…</span>}
        {selectedCity && !loading && quote && (
          quote.freeShipping ? (
            <span className="font-semibold text-green-600">🎉 Envío gratis a {selectedCity.name}</span>
          ) : (
            <span className="text-gray-700">
              Envío a {selectedCity.name}: <strong>{formatCOP(quote.quotedShippingTotal)}</strong>
            </span>
          )
        )}
        {selectedCity && !loading && error && (
          <span className="text-xs text-gray-400">No pudimos calcularlo ahora; lo verás en el carrito.</span>
        )}
      </div>

      {freeShippingThreshold > 0 && (
        <p className="mt-1 text-xs text-gray-400">
          {freeByThreshold
            ? `Este producto supera los ${formatCOP(freeShippingThreshold)} del envío gratis.`
            : `Envío gratis en compras desde ${formatCOP(freeShippingThreshold)}.`}
        </p>
      )}
    </div>
  )
}
