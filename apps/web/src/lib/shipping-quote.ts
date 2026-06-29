'use client'

/**
 * Cache cliente de cotizaciones de envío — compartida entre /carrito y /checkout.
 *
 * Por qué cache cliente y no servidor:
 *   - Vendelo cobra por hit a su API (a futuro). El cache reduce llamadas.
 *   - Mantiene a NestJS/Cloud Run stateless (autoscale sin coordinación).
 *   - El admin puede cambiar precios; como esto es solo informativo (Vendelo
 *     cobra el envío al cliente, no nosotros), no hay riesgo de servir un
 *     precio de producto desactualizado — solo el costo de envío, que cambia
 *     con poca frecuencia.
 *
 * Por qué sessionStorage y no localStorage:
 *   El estimado de envío no debe sobrevivir entre sesiones — si el cliente
 *   vuelve días después, los precios/tarifas pueden haber cambiado.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const TTL_MS = 5 * 60 * 1000 // 5 min — las tarifas de Vendelo no cambian con frecuencia

export interface ShippingQuoteRequestItem {
  productId: string
  quantity: number
}

export interface ShippingQuoteRequest {
  shippingCityCode: string
  shippingSubdivisionCode: string
  items: ShippingQuoteRequestItem[]
  paymentMethod: 'COD' | 'EXTERNAL_PAYMENT'
}

export interface ShippingQuoteResult {
  quotedShippingTotal: number
  freeShipping: boolean
}

interface CachedQuote extends ShippingQuoteResult {
  fetchedAt: number
}

/**
 * Cache key estable sin importar el orden en que los ítems llegaron al carrito.
 * Ej: "11001000-prod1x2|prod2x1"
 */
export function buildShippingQuoteCacheKey(
  cityCode: string,
  items: ShippingQuoteRequestItem[],
): string {
  const itemsKey = items
    .map((i) => `${i.productId}x${i.quantity}`)
    .sort()
    .join('|')
  return `${cityCode}-${itemsKey}`
}

interface ShippingQuoteStore {
  cache: Record<string, CachedQuote>

  /**
   * Retorna la cotización cacheada si sigue vigente (TTL 5 min), o null si
   * no existe o expiró — el caller decide si recalcular.
   */
  getCached: (cacheKey: string) => ShippingQuoteResult | null

  /**
   * Cotiza contra el proxy de Next.js (que a su vez llama a NestJS → Vendelo).
   * Cachea el resultado exitoso. Retorna null si falla — el caller degrada
   * elegante (no bloquea checkout, solo no muestra el costo).
   */
  fetchQuote: (request: ShippingQuoteRequest) => Promise<ShippingQuoteResult | null>
}

export const useShippingQuoteStore = create<ShippingQuoteStore>()(
  persist(
    (set, get) => ({
      cache: {},

      getCached: (cacheKey) => {
        const entry = get().cache[cacheKey]
        if (!entry) return null
        if (Date.now() - entry.fetchedAt > TTL_MS) return null
        return { quotedShippingTotal: entry.quotedShippingTotal, freeShipping: entry.freeShipping }
      },

      fetchQuote: async (request) => {
        const cacheKey = buildShippingQuoteCacheKey(request.shippingCityCode, request.items)
        const cached = get().getCached(cacheKey)
        if (cached) return cached

        try {
          const res = await fetch('/api/shipping/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          })
          if (!res.ok) return null

          const data = (await res.json()) as ShippingQuoteResult
          set((state) => ({
            cache: {
              ...state.cache,
              [cacheKey]: { ...data, fetchedAt: Date.now() },
            },
          }))
          return data
        } catch {
          return null
        }
      },
    }),
    {
      name: 'electro-motos-shipping-quote',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ cache: state.cache }),
    },
  ),
)
