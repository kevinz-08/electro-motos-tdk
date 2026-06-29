'use client'

/**
 * Calculador de envío para /carrito (y reusado en /checkout vía la misma
 * cache). Es puramente informativo — Vendelo cobra el envío al cliente al
 * momento de la entrega, no nuestro Wompi — así que un fallo nunca debe
 * bloquear "Finalizar pedido", solo se omite el costo mostrado.
 */
import { useEffect, useRef, useState } from 'react'
import { CitySelector, type CityOption } from '@/components/checkout/CitySelector'
import { useShippingQuoteStore, type ShippingQuoteResult } from '@/lib/shipping-quote'

const DEBOUNCE_MS = 500

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

interface ShippingQuoteCalculatorProps {
  city: CityOption | null
  onCityChange: (city: CityOption | null) => void
  items: Array<{ productId: string; quantity: number }>
  /** Notifica al carrito el resultado vigente para que actualice el total mostrado. */
  onQuoteChange?: (result: ShippingQuoteResult | null) => void
}

export function ShippingQuoteCalculator({ city, onCityChange, items, onQuoteChange }: ShippingQuoteCalculatorProps) {
  const fetchQuote = useShippingQuoteStore((s) => s.fetchQuote)
  const getCached = useShippingQuoteStore((s) => s.getCached)
  const [quote, setQuote] = useState<ShippingQuoteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cantidad/items como string estable para detectar cambios reales del carrito
  // sin disparar el efecto por una nueva referencia del array en cada render.
  const itemsKey = items.map((i) => `${i.productId}x${i.quantity}`).sort().join('|')

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!city || items.length === 0) {
      setQuote(null)
      setError(false)
      onQuoteChange?.(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      void (async () => {
        setError(false)

        const cacheKey = `${city.code}-${itemsKey}`
        const cached = getCached(cacheKey)
        if (cached) {
          setQuote(cached)
          onQuoteChange?.(cached)
          return
        }

        setLoading(true)
        const result = await fetchQuote({
          shippingCityCode: city.code,
          shippingSubdivisionCode: city.subdivisionCode,
          items,
          paymentMethod: 'EXTERNAL_PAYMENT',
        })
        setLoading(false)

        if (!result) {
          setError(true)
          setQuote(null)
          onQuoteChange?.(null)
          return
        }

        setQuote(result)
        onQuoteChange?.(result)
      })()
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemsKey ya resume `items`
  }, [city, itemsKey])

  return (
    <div className="mb-1">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-500">Envío</span>
        {!city && <span className="text-gray-400 italic">Calcula tu envío</span>}
        {city && loading && <span className="text-gray-400">Calculando...</span>}
        {city && !loading && quote && quote.freeShipping && (
          <span className="inline-flex items-center gap-1 text-green-600 font-semibold text-xs bg-green-50 px-2 py-0.5 rounded-full">
            🎉 ¡Envío gratis!
          </span>
        )}
        {city && !loading && quote && !quote.freeShipping && (
          <span className="text-gray-700 font-medium">{formatCOP(quote.quotedShippingTotal)}</span>
        )}
        {city && !loading && error && (
          <span className="text-gray-400 italic text-xs">No se pudo calcular ahora</span>
        )}
      </div>

      <CitySelector
        value={city}
        onChange={(c) => onCityChange(c)}
        disabled={false}
      />

      {city && error && (
        <p className="text-xs text-gray-400 mt-1.5">
          Se calculará en el checkout.
        </p>
      )}

      <p className="text-xs text-gray-400 mt-1.5">
        Gratis en compras mayores a $500.000 ·{' '}
        <a
          href="/legal/politica-de-envios"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-sky-600 transition-colors"
        >
          Ver política de envíos
        </a>
      </p>
    </div>
  )
}
