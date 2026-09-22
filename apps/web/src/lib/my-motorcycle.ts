/**
 * "Mi moto" — la moto que el comprador ha seleccionado (docs/seo/, Fase 2).
 *
 * Se guarda en una **cookie** y no en localStorage por dos razones:
 *   - Viaja al servidor, así que cualquier ruta que sea dinámica (checkout,
 *     pedidos) puede usarla sin JavaScript.
 *   - Es una preferencia del navegador, no del usuario logueado: funciona igual
 *     en compra como invitado.
 *
 * IMPORTANTE, y por eso está aquí escrito: **las páginas de catálogo y de
 * producto no leen esta cookie en el servidor**. La ficha de producto es
 * estática (`generateStaticParams` + ISR de 5 min) y llamar a `cookies()` en
 * ella la convertiría en dinámica, perdiendo el prerender y empeorando el TTFB
 * de la página más importante de la tienda. El badge de compatibilidad se pinta
 * en el cliente, justo después de hidratar, a partir de esta misma cookie.
 *
 * No se pierde nada en SEO: un crawler nunca tiene moto seleccionada, así que no
 * hay badge que enseñarle. Lo que sí necesita ver —la tabla "Compatible con"—
 * se renderiza en el servidor y entra en el HTML estático.
 *
 * La cookie no lleva datos personales: marca, modelo y año de la moto.
 */

export const MY_MOTORCYCLE_COOKIE = 'h2r-moto'

/** Un año. Es una preferencia, no una sesión: no caduca pronto a propósito. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export interface MyMotorcycle {
  brandSlug: string
  modelSlug: string
  /** Nombre completo para mostrar: "AKT NKD 125". */
  label: string
  /** Año declarado por el comprador. `null` = no lo dijo. */
  year: number | null
}

/**
 * Interpreta el valor de la cookie. Devuelve `null` ante cualquier problema
 * (ausente, corrupta, de una versión anterior del formato): una preferencia rota
 * nunca debe romper una página.
 */
export function parseMyMotorcycle(raw: string | undefined): MyMotorcycle | null {
  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw))
    if (typeof parsed !== 'object' || parsed === null) return null

    const { brandSlug, modelSlug, label, year } = parsed as Record<string, unknown>
    if (typeof brandSlug !== 'string' || typeof modelSlug !== 'string' || typeof label !== 'string') {
      return null
    }

    return {
      brandSlug,
      modelSlug,
      label,
      year: typeof year === 'number' && Number.isInteger(year) ? year : null,
    }
  } catch {
    return null
  }
}

/** Lee la cookie desde el navegador. En el servidor devuelve `null`. */
export function readMyMotorcycle(): MyMotorcycle | null {
  if (typeof document === 'undefined') return null

  const match = document.cookie.match(new RegExp(`(?:^|; )${MY_MOTORCYCLE_COOKIE}=([^;]*)`))
  return parseMyMotorcycle(match?.[1])
}

/** Guarda la moto y avisa a los componentes suscritos. */
export function writeMyMotorcycle(moto: MyMotorcycle): void {
  document.cookie = `${MY_MOTORCYCLE_COOKIE}=${encodeURIComponent(JSON.stringify(moto))}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`
  notifyChange()
}

/** Borra la moto seleccionada. */
export function clearMyMotorcycle(): void {
  document.cookie = `${MY_MOTORCYCLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`
  notifyChange()
}

// ── Suscripción ──────────────────────────────────────────────────────────────
//
// El badge de la ficha y el selector del header son componentes distintos, en
// puntos distintos del árbol. Cuando el selector cambia la moto, el badge tiene
// que enterarse sin recargar la página. Un evento del navegador es suficiente y
// evita meter un store global solo para esto.

const CHANGE_EVENT = 'h2r-moto-change'

function notifyChange(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Para `useSyncExternalStore`. Devuelve la función de baja. */
export function subscribeToMyMotorcycle(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback)
  // `storage` cubre el caso de dos pestañas abiertas del mismo sitio.
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}
