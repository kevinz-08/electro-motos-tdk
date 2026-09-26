'use client'

/**
 * Aviso de cookies de analítica. Aparece solo si GA4 está configurado y el
 * visitante aún no ha elegido. Aceptar y rechazar tienen el mismo peso visual:
 * el rechazo no debe costar más esfuerzo que la aceptación.
 *
 * `ManageConsentLink` (en el pie de página) permite cambiar la decisión luego.
 */
import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  GA_ID,
  readConsent,
  resetConsent,
  subscribeToConsent,
  writeConsent,
  type ConsentState,
} from '@/lib/analytics'

const noConsentOnServer = (): ConsentState => null

/**
 * El aviso espera a la primera interacción real (scroll, toque, clic o tecla).
 * Si apareciera al hidratar, su párrafo podía ser el elemento más grande pintado
 * y Chrome lo tomaba como LCP (pasó en la ficha de producto: 2,4 s de render
 * delay, H-36). El LCP deja de medirse con la primera interacción, así que desde
 * ese momento el aviso ya no compite. GA no carga sin consentimiento: esperar no
 * hace perder datos de nadie que haya aceptado.
 */
let interacted = false
const interactionListeners = new Set<() => void>()
const INTERACTION_EVENTS = ['scroll', 'pointerdown', 'keydown', 'touchstart'] as const

function markInteracted() {
  if (interacted) return
  interacted = true
  for (const event of INTERACTION_EVENTS) window.removeEventListener(event, markInteracted)
  interactionListeners.forEach((listener) => listener())
}

function subscribeToInteraction(listener: () => void) {
  interactionListeners.add(listener)
  if (!interacted && interactionListeners.size === 1) {
    for (const event of INTERACTION_EVENTS) window.addEventListener(event, markInteracted, { passive: true })
  }
  return () => {
    interactionListeners.delete(listener)
  }
}

const hasInteracted = () => interacted
const notInteractedOnServer = () => false

export function CookieConsentBanner() {
  const consent = useSyncExternalStore(subscribeToConsent, readConsent, noConsentOnServer)
  const ready = useSyncExternalStore(subscribeToInteraction, hasInteracted, notInteractedOnServer)
  if (!GA_ID || consent !== null || !ready) return null

  return (
    <div
      role="dialog"
      aria-label="Cookies de analítica"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-gray-200 bg-white px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.1)]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Usamos cookies de analítica (Google Analytics) para entender qué páginas te sirven y mejorar la tienda. No
          guardamos datos personales en ellas.{' '}
          <Link href="/legal/politica-de-privacidad#seccion-cookies" className="text-sky-600 underline">
            Más información sobre las cookies de analítica
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => writeConsent('denied')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => writeConsent('granted')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}

/** Enlace del pie de página para reabrir la decisión. No se pinta sin GA_ID. */
export function ManageConsentLink({ className = '' }: { className?: string }) {
  if (!GA_ID) return null
  return (
    <button type="button" className={className} onClick={resetConsent}>
      Cookies de analítica
    </button>
  )
}
