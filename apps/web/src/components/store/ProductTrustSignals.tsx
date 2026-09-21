/**
 * Señales de confianza de la PDP (README §22.3 y §22.6). Server-safe.
 *
 * Todas se alimentan de datos reales y se ocultan si no alcanzan el umbral
 * configurado en /admin/configuracion — nunca se muestran cifras inventadas
 * (Ley 1480 / SIC).
 */

// ── Ventas ────────────────────────────────────────────────────────────────────

/**
 * "🔥 +X personas han comprado o recomiendan este producto".
 * X = recomendaciones de la tienda física (admin) + ventas online reales (soldCount),
 * así el número sube solo con cada compra confirmada.
 */
export function SoldCountBadge({
  soldCount, storeRecommendations = 0, minSold,
}: { soldCount: number; storeRecommendations?: number; minSold: number }) {
  const total = soldCount + storeRecommendations
  if (total <= 0 || total < minSold) return null
  return (
    <p className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600">
      <span aria-hidden="true">🔥</span>
      +{total.toLocaleString('es-CO')} {total === 1 ? 'persona ha comprado o recomienda' : 'personas han comprado o recomiendan'} este producto
    </p>
  )
}

// ── Rating ────────────────────────────────────────────────────────────────────

export interface RatingSummary {
  /** Promedio 1–5 con decimales. */
  average: number
  /** Reseñas aprobadas. */
  count: number
  /** 0–100, redondeado. */
  recommendPercent: number
}

function Star({ fill }: { fill: number }) {
  // fill: 0..1 — porción rellena de la estrella
  const id = `star-${Math.round(fill * 100)}`
  return (
    <svg className="w-4 h-4" viewBox="0 0 20 20" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
          <stop offset={`${fill * 100}%`} stopColor="#e5e7eb" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.43 4.4a1 1 0 00.95.69h4.63c.97 0 1.37 1.24.59 1.81l-3.75 2.72a1 1 0 00-.36 1.12l1.43 4.4c.3.92-.76 1.69-1.54 1.12l-3.75-2.72a1 1 0 00-1.18 0l-3.75 2.72c-.78.57-1.84-.2-1.54-1.12l1.43-4.4a1 1 0 00-.36-1.12L.99 9.83c-.78-.57-.38-1.81.59-1.81h4.63a1 1 0 00.95-.69l1.43-4.4z"
      />
    </svg>
  )
}

export function StarRating({ average }: { average: number }) {
  return (
    <span className="inline-flex items-center" role="img" aria-label={`Calificación ${average.toFixed(1)} de 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} fill={Math.max(0, Math.min(1, average - i))} />
      ))}
    </span>
  )
}

export function RatingSummaryRow({ summary, minCount }: { summary: RatingSummary | null; minCount: number }) {
  if (!summary || summary.count < minCount) return null
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <StarRating average={summary.average} />
      <span className="font-semibold text-gray-900">{summary.average.toFixed(1)}</span>
      <a href="#resenas" className="text-gray-500 underline-offset-2 hover:underline">
        ({summary.count} {summary.count === 1 ? 'reseña' : 'reseñas'})
      </a>
      <span className="text-gray-300" aria-hidden="true">·</span>
      <span className="text-green-700 font-medium">
        {summary.recommendPercent}% de clientes recomiendan este producto
      </span>
    </div>
  )
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export function StockStatus({ stock, urgencyThreshold }: { stock: number; urgencyThreshold: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-red-600 font-medium">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Agotado
      </span>
    )
  }
  if (stock < urgencyThreshold) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        ¡Solo {stock === 1 ? 'queda 1 unidad' : `quedan ${stock} unidades`} en stock!
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
      <span className="w-2 h-2 rounded-full bg-green-500" />
      En stock
    </span>
  )
}

// ── Pago seguro ───────────────────────────────────────────────────────────────

export function SecurePaymentBadge() {
  return (
    <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-green-100 bg-green-50/60 px-4 py-2.5 text-xs text-gray-600">
      <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      <span>
        <strong className="font-semibold text-gray-800">PAGO SEGURO</strong>
        {' '}· Con Wompi · Tarjeta de Credito, Tarjeta de Debito, PSE, Nequi, ADDI y contra entrega
      </span>
    </div>
  )
}
