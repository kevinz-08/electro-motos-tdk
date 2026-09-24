/**
 * Analítica de eventos con GA4 (docs/seo/ Fase 4, ítem 11 — H-11).
 *
 * Tres reglas:
 *   1. **Solo con consentimiento.** GA4 no se carga hasta que el visitante acepta
 *      las cookies de analítica (Ley 1581 de 2012). Sin consentimiento, `track()`
 *      no hace nada. El consentimiento vive en localStorage, es por navegador y
 *      se puede cambiar en cualquier momento desde el pie de página.
 *   2. **Sin ID, sin analítica.** Si `NEXT_PUBLIC_GA_ID` no está definida, no se
 *      carga nada ni se muestra el aviso de cookies.
 *   3. **Nunca datos personales.** Los eventos llevan producto, precio y
 *      cantidades; jamás nombre, email, teléfono, documento ni dirección.
 *
 * Eventos del embudo de comercio (nombres estándar de GA4, para que los informes
 * de comercio electrónico funcionen sin configuración extra):
 *   view_item → add_to_cart → view_cart → begin_checkout → purchase
 * más `search` (búsqueda interna) y `generate_lead` (clic en WhatsApp).
 *
 * Los importes van en pesos COP (centavos / 100), la unidad que GA espera con
 * `currency: 'COP'`.
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? ''

export const CONSENT_KEY = 'h2r-analytics-consent'
export const CONSENT_EVENT = 'h2r-analytics-consent-change'

export type ConsentState = 'granted' | 'denied' | null

/** Lee la decisión guardada. `null` = todavía no ha elegido (o no hay storage). */
export function readConsent(): ConsentState {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

export function writeConsent(state: 'granted' | 'denied'): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, state)
  } catch {
    /* sin storage: la decisión vale solo para esta visita */
  }
  window.dispatchEvent(new Event(CONSENT_EVENT))
}

/** Borra la decisión para que el aviso vuelva a preguntar. */
export function resetConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_KEY)
  } catch {
    /* sin storage */
  }
  window.dispatchEvent(new Event(CONSENT_EVENT))
}

export function subscribeToConsent(callback: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(CONSENT_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

/** Ítem en el formato de comercio electrónico de GA4. */
export interface GaItem {
  item_id: string
  item_name: string
  price: number
  quantity: number
}

/** Producto mínimo necesario para describir un ítem. Precio en centavos COP. */
export interface TrackableProduct {
  sku: string
  name: string
  price: number
}

/** Centavos COP → pesos COP, que es lo que GA espera. */
export const toPesos = (cents: number): number => Math.round(cents) / 100

export function toGaItem(product: TrackableProduct, quantity = 1): GaItem {
  return { item_id: product.sku, item_name: product.name, price: toPesos(product.price), quantity }
}

type GtagWindow = Window & { dataLayer?: unknown[] }

/**
 * Encola un evento en `dataLayer` con el mismo formato que `gtag()`, de modo que
 * funciona aunque gtag.js aún no haya terminado de cargar: GA procesa la cola al
 * iniciar. gtag.js solo reconoce objetos `arguments`, no arreglos, por eso se
 * empuja `arguments` desde una función normal.
 */
export function track(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined' || !GA_ID || readConsent() !== 'granted') return
  const w = window as GtagWindow
  const layer = (w.dataLayer = w.dataLayer ?? [])
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    layer.push(arguments)
  }
  gtag('event', name, params)
}
