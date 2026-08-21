/**
 * Primitivas visuales compartidas por el modal de detalle de pedido.
 *
 * Viven en su propio archivo (y no dentro de OrderInfoModal) porque
 * VendeloGuiaSection también las usa: importarlas desde OrderInfoModal crearía
 * una dependencia circular, ya que el modal renderiza esa sección.
 */

export function formatDateTime(d: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

/** Color por estado — cubre estados de pedido, de pago y de envío en un solo mapa. */
export const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-400',
  PAID: 'bg-green-500/20 text-green-400',
  SHIPPED: 'bg-blue-500/20 text-blue-400',
  DELIVERED: 'bg-purple-500/20 text-purple-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  DECLINED: 'bg-red-500/20 text-red-400',
  PREPARING: 'bg-indigo-500/20 text-indigo-400',
  READY: 'bg-cyan-500/20 text-cyan-400',
  INCIDENT: 'bg-orange-500/20 text-orange-400',
  RETURNED: 'bg-red-500/20 text-red-400',
  PROCESSING: 'bg-indigo-500/20 text-indigo-400',
  SENT: 'bg-green-500/20 text-green-400',
  FAILED: 'bg-red-500/20 text-red-400',
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-wide mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

export function KV({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-white/40 w-28 shrink-0">{label}</span>
      <span className={`text-white ${mono ? 'font-mono text-xs' : ''} break-all`}>{value}</span>
    </div>
  )
}

export function Pill({ label, color }: { label: string; color?: string }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${color ?? 'bg-white/10 text-white/60'}`}>
      {label}
    </span>
  )
}
