/**
 * Barra de progreso hacia el envío gratis (Fase 4, ítem 5). Server-safe.
 *
 * `threshold` y `subtotal` van en centavos COP. Con `threshold = 0` no se pinta
 * nada: el negocio no promete envío gratis. Es solo informativa: el cobro real
 * del flete lo decide la cotización de Vendelo, no este componente.
 */
import { formatCOP } from '@/components/store/PriceTag'

export function FreeShippingProgress({
  subtotal,
  threshold,
  className = '',
}: {
  subtotal: number
  threshold: number
  className?: string
}) {
  if (threshold <= 0) return null

  const remaining = Math.max(0, threshold - subtotal)
  const reached = remaining === 0
  const percent = Math.min(100, Math.round((subtotal / threshold) * 100))

  return (
    <div className={`rounded-xl border px-4 py-3 ${reached ? 'border-green-200 bg-green-50' : 'border-sky-100 bg-sky-50'} ${className}`}>
      <p className={`text-sm font-medium ${reached ? 'text-green-700' : 'text-gray-700'}`}>
        {reached ? (
          <>🎉 ¡Tu pedido tiene envío gratis!</>
        ) : (
          <>
            Te faltan <strong>{formatCOP(remaining)}</strong> para el envío gratis
          </>
        )}
      </p>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Progreso hacia el envío gratis"
      >
        <div
          className={`h-full rounded-full transition-all ${reached ? 'bg-green-500' : 'bg-sky-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
