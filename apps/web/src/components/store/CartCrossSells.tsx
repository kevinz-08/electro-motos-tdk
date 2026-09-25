'use client'

/**
 * Sugerencias de venta cruzada en /carrito (docs/seo/plan-venta-cruzada.md).
 *
 * El carrito vive en localStorage, así que pide sus sugerencias a
 * `GET /api/cross-sells?ids=…` cada vez que cambia el conjunto de productos.
 * Lo que ya está en el carrito no se sugiere. Un fallo de red o una lista vacía
 * no muestran nada: es un complemento, nunca bloquea la compra.
 */
import { useEffect, useState } from 'react'
import { useCart } from '@/lib/cart'
import { CrossSellList } from '@/components/store/CrossSellList'
import type { CrossSellSuggestion } from '@/lib/cross-sell'

export function CartCrossSells({ className = '' }: { className?: string }) {
  const { items } = useCart()
  const [suggestions, setSuggestions] = useState<CrossSellSuggestion[]>([])
  const idsKey = items.map((i) => i.product.id).sort().join(',')

  useEffect(() => {
    if (!idsKey) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cross-sells?ids=${encodeURIComponent(idsKey)}`, { signal: controller.signal })
        if (!res.ok) return setSuggestions([])
        const data = (await res.json()) as { suggestions: CrossSellSuggestion[] }
        setSuggestions(data.suggestions)
      } catch {
        /* cancelado o sin red: no se muestra nada */
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [idsKey])

  // Con el carrito vacío no hay nada que mostrar (se ignora lo que quedó de antes).
  if (!idsKey || suggestions.length === 0) return null

  return (
    <CrossSellList
      suggestions={suggestions}
      heading="Completa tu compra con…"
      listName="venta_cruzada_carrito"
      className={className}
    />
  )
}
