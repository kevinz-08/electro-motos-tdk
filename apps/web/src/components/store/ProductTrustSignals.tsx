/**
 * Señales de confianza de la PDP (README §22.3 y §22.6). Server-safe.
 *
 * Todas se alimentan de datos reales y se ocultan si no alcanzan el umbral
 * configurado en /admin/configuracion — nunca se muestran cifras inventadas
 * (Ley 1480 / SIC).
 */
import { Star as StarIcon } from 'lucide-react'

// ── Ventas ────────────────────────────────────────────────────────────────────

/**
 * "+X personas han comprado y recomiendan este producto".
 * X = recomendaciones de la tienda física (admin) + ventas online reales (soldCount),
 * así el número sube solo con cada compra confirmada. La redacción con "y" la
 * eligió el negocio el 2026-10-01, advertido de que X suma las dos fuentes.
 */
export function SoldCountBadge({
  soldCount, storeRecommendations = 0, minSold,
}: { soldCount: number; storeRecommendations?: number; minSold: number }) {
  const total = soldCount + storeRecommendations
  if (total <= 0 || total < minSold) return null
  return (
    <p className="text-sm font-medium text-orange-600">
      +{total.toLocaleString('es-CO')} {total === 1 ? 'persona ha comprado y recomienda' : 'personas han comprado y recomiendan'} este producto
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
  // fill: 0..1 — porción rellena de la estrella (estrella gris debajo, ámbar recortada encima)
  return (
    <span className="relative inline-block w-4 h-4" aria-hidden="true">
      <StarIcon className="absolute inset-0 w-4 h-4 fill-gray-200 text-gray-200" />
      {fill > 0 && (
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
          <StarIcon className="w-4 h-4 fill-amber-400 text-amber-400" />
        </span>
      )}
    </span>
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
      // Rojo (antes ámbar) para generar más urgencia. Distinto de "Agotado", que es
      // texto rojo sin fondo ni punto parpadeante.
      <span className="inline-flex items-center gap-1.5 text-sm text-red-700 font-semibold bg-red-50 border border-red-200 rounded-full px-3 py-1">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
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
