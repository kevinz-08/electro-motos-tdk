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
    try {
      if (dedupeKey && window.sessionStorage.getItem(dedupeKey)) return
    } catch {
      /* sin storage: se envía igual */
    }
    // La marca de "ya enviado" solo se guarda si el evento realmente salió
    // (con consentimiento); si se descartó, el siguiente montaje lo reintenta.
    if (track(name, JSON.parse(serialized) as Record<string, unknown>) && dedupeKey) {
      try {
        window.sessionStorage.setItem(dedupeKey, '1')
      } catch {
        /* sin storage */
      }
    }
  }, [name, serialized, dedupeKey])
  return null
}
