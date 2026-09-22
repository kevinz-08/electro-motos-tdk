'use client'

/**
 * Badge de compatibilidad con la moto del comprador (docs/seo/, Fase 2).
 *
 * Tres estados, y la diferencia entre ellos importa:
 *
 *   compatible    → hay un fitment **verificado** para su moto (y su año, si lo
 *                   dio). Verde, afirmativo.
 *   no confirmado → no hay fitment verificado. **No dice "no sirve"**: dice que
 *                   no está confirmado, que no es lo mismo. El catálogo de
 *                   compatibilidades está en construcción, y afirmar lo
 *                   contrario sería mentirle al comprador. Ofrece confirmarlo
 *                   por WhatsApp.
 *   sin moto      → no se renderiza nada.
 *
 * Es un Client Component a propósito: lee la cookie en el navegador para que la
 * ficha de producto siga siendo estática (ver `lib/my-motorcycle.ts`). Aparece
 * al hidratar, que es cuando el comprador ya tiene la página delante.
 *
 * La lista de modelos compatibles llega como prop desde el servidor, ya filtrada
 * a fitments verificados: el cliente solo compara, no decide qué es compatible.
 */
import { useSyncExternalStore } from 'react'
import { fitsYear } from '@h2r/domain'
import { WHATSAPP_URL } from '@/lib/contact'
import { readMyMotorcycle, subscribeToMyMotorcycle, type MyMotorcycle } from '@/lib/my-motorcycle'

/** Modelo compatible, reducido a lo serializable que necesita la comparación. */
export interface CompatibleModelRef {
  brandSlug: string
  modelSlug: string
  yearFrom: number | null
  yearTo: number | null
}

interface Props {
  compatibleModels: CompatibleModelRef[]
  productName: string
  productSku: string
  className?: string
}

/** En el servidor no hay cookie: se devuelve null y no se pinta nada. */
const noneOnServer = (): MyMotorcycle | null => null

export function CompatibilityBadge({
  compatibleModels,
  productName,
  productSku,
  className = '',
}: Props) {
  const moto = useSyncExternalStore(subscribeToMyMotorcycle, readMyMotorcycle, noneOnServer)

  if (!moto) return null

  const compatible = compatibleModels.some(
    (m) =>
      m.brandSlug === moto.brandSlug &&
      m.modelSlug === moto.modelSlug &&
      fitsYear({ yearFrom: m.yearFrom, yearTo: m.yearTo }, moto.year),
  )

  if (compatible) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ${className}`}
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Compatible con tu {moto.label}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800 ${className}`}
    >
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <span>
        No confirmado para tu {moto.label} —{' '}
        <a
          href={WHATSAPP_URL(
            `Hola H2R, ¿${productName} (SKU ${productSku}) le sirve a mi ${moto.label}?`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline hover:text-amber-900"
        >
          confírmalo por WhatsApp
        </a>
      </span>
    </span>
  )
}
