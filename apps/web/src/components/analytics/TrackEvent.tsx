'use client'

/**
 * Dispara un evento de GA4 al montarse. Permite medir desde Server Components
 * (ficha, checkout, confirmación) sin volverlos clientes. Con `dedupeKey` el
 * evento sale una sola vez por pestaña (p. ej. `purchase` al recargar).
 */
import { useEffect } from 'react'
import { track } from '@/lib/analytics'

export function TrackEvent({
  name,
  params,
  dedupeKey,
}: {
  name: string
  params?: Record<string, unknown>
  dedupeKey?: string
}) {
  const serialized = JSON.stringify(params ?? {})
  useEffect(() => {
    if (dedupeKey) {
      try {
        if (window.sessionStorage.getItem(dedupeKey)) return
        window.sessionStorage.setItem(dedupeKey, '1')
      } catch {
        /* sin storage: se envía igual */
      }
    }
    track(name, JSON.parse(serialized) as Record<string, unknown>)
  }, [name, serialized, dedupeKey])
  return null
}
