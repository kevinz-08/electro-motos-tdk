'use client'

/**
 * `view_cart` y `begin_checkout` a partir del carrito real del visitante. Se
 * monta en /carrito y /checkout; sale una sola vez por pestaña y solo si el
 * carrito tiene productos.
 */
import { useEffect } from 'react'
import { useCart } from '@/lib/cart'
import { toGaItem, toPesos, track } from '@/lib/analytics'

export function CartFunnelTracker({ event }: { event: 'view_cart' | 'begin_checkout' }) {
  const { items } = useCart()
  const hasItems = items.length > 0

  useEffect(() => {
    if (!hasItems) return
    const key = `ga-${event}`
    try {
      if (window.sessionStorage.getItem(key)) return
      window.sessionStorage.setItem(key, '1')
    } catch {
      /* sin storage: se envía igual */
    }
    track(event, {
      currency: 'COP',
      value: toPesos(items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)),
      items: items.map((i) => toGaItem(i.product, i.quantity)),
    })
    // Solo al montar con carrito: cambios posteriores de cantidad no son otro evento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasItems, event])

  return null
}
