import { PrismaOrderRepository } from '@/infrastructure/repositories/PrismaOrderRepository'
import { prisma } from '@/infrastructure/database/prisma-client'
import { OrderStatus } from '@h2r/domain'
import { OrderStatusSelect } from '@/components/admin/OrderStatusSelect'
import { OrderInfoModal } from '@/components/admin/OrderInfoModal'
import { AdminHelpButton } from '@/components/admin/AdminHelpButton'
import { pedidosHelpContent } from '@/components/admin/help-content/pedidos'
import { getPaginationPages } from '@/lib/pagination'

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pendiente', color: 'bg-amber-500/20 text-amber-400' },
  PAID:      { label: 'Pagado',    color: 'bg-green-500/20 text-green-400' },
  SHIPPED:   { label: 'Enviado',   color: 'bg-blue-500/20 text-blue-400' },
  DELIVERED: { label: 'Entregado', color: 'bg-purple-500/20 text-purple-400' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
}

const providerLabels: Record<string, string> = {
  WOMPI: 'Wompi',
  MERCADO_PAGO: 'Mercado Pago',
}

/**
 * Indicador de despacho de la columna "Guía".
 *
 * Antes, un pedido pagado cuyo despacho a Vendelo falló era invisible en esta
 * lista: la alerta CRITICAL solo iba a los logs. El punto de color lo hace
 * evidente de un vistazo; el detalle y las acciones viven en el modal.
 */
type GuiaState = { dot: string; label: string }

function guiaState(input: {
  deliveryMethod: string
  vendeloOrderId: string | null
  shipmentStatus: string | undefined
  queueStatus: string | undefined
}): GuiaState {
  if (input.deliveryMethod === 'STORE_PICKUP') {
    return { dot: 'bg-white/20', label: 'Retiro en tienda — sin guía' }
  }
  if (input.shipmentStatus) {
    return { dot: 'bg-green-400', label: `Guía creada — ${input.shipmentStatus}` }
  }
  if (input.queueStatus === 'FAILED') {
    return { dot: 'bg-red-500', label: 'Despacho fallido — requiere reintento' }
  }
  if (input.vendeloOrderId) {
    return { dot: 'bg-sky-400', label: 'En Vendelo — falta generar la guía' }
  }
  if (input.queueStatus === 'PENDING' || input.queueStatus === 'PROCESSING') {
    return { dot: 'bg-amber-400', label: 'En cola de despacho' }
  }
  return { dot: 'bg-white/20', label: 'Sin despacho' }
}

export default async function AdminPedidosPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page ?? 1)

  const repo = new PrismaOrderRepository()
  const status = params.status as OrderStatus | undefined
  const limit = 20
  const [orders, total] = await Promise.all([
    repo.findAll({ status, page, limit }),
    repo.countAll({ status }),
  ])
  const totalPages = Math.ceil(total / limit)

  // Estado de despacho de la página actual — tres queries agregadas sobre los
  // ≤20 pedidos visibles, no una por fila.
  const orderIds = orders.map((o) => o.id)
  const [vendeloIds, shipments, queueRows] = await Promise.all([
    prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: { id: true, vendeloOrderId: true },
    }),
    prisma.shipment.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true, status: true },
    }),
    // orderBy desc + un solo Map: gana la fila más reciente por pedido, que es
    // la que refleja el estado actual tras un reintento manual.
    prisma.vendeloOrderQueue.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true, status: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const vendeloIdByOrder = new Map(vendeloIds.map((r) => [r.id, r.vendeloOrderId]))
  const shipmentByOrder = new Map(shipments.map((r) => [r.orderId, r.status]))
  const queueByOrder = new Map<string, string>()
  for (const row of queueRows) if (!queueByOrder.has(row.orderId)) queueByOrder.set(row.orderId, row.status)

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Pedidos</h1>
        <AdminHelpButton content={pedidosHelpContent} />
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[undefined, 'PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
          <a
            key={s ?? 'all'}
            href={s ? `/admin/pedidos?status=${s}` : '/admin/pedidos'}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              params.status === s || (!params.status && !s)
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 border border-white/10 text-white/50 hover:border-white/30 hover:text-white'
            }`}
          >
            {s ? statusConfig[s]?.label : 'Todos'}
          </a>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Pedido</th>
              <th className="text-left px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Fecha</th>
              <th className="text-left px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Pasarela</th>
              <th className="text-right px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Total</th>
              <th className="text-center px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Estado</th>
              <th className="text-center px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Guía</th>
              <th className="px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Cambiar estado</th>
              <th className="px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((order) => {
              const sc = statusConfig[order.status] ?? { label: order.status, color: 'bg-white/10 text-white/50' }
              const guia = guiaState({
                deliveryMethod: order.deliveryMethod,
                vendeloOrderId: vendeloIdByOrder.get(order.id) ?? null,
                shipmentStatus: shipmentByOrder.get(order.id),
                queueStatus: queueByOrder.get(order.id),
              })
              return (
                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-white font-medium">
                    #{order.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-white/50">
                    {new Date(order.createdAt).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-white/50">
                      {providerLabels[order.paymentProvider] ?? order.paymentProvider}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-white">
                    {formatCOP(order.total)}
                    {order.shippingTotal > 0 && (
                      <span className="block text-xs font-normal text-white/30">
                        incl. envío {formatCOP(order.shippingTotal)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      title={guia.label}
                      aria-label={guia.label}
                      className={`inline-block w-2.5 h-2.5 rounded-full ${guia.dot}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <OrderInfoModal orderId={order.id} />
                      <a
                        href={`/api/orders/${order.id}/comprobante`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Descargar comprobante de venta"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </a>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="text-center py-12 text-white/30">No hay pedidos</div>
        )}
      </div>

      {/* Leyenda de la columna "Guía" — los colores no se explican solos */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-white/30">
        <span className="font-medium text-white/40">Guía:</span>
        {[
          { dot: 'bg-green-400', text: 'creada' },
          { dot: 'bg-sky-400', text: 'en Vendelo' },
          { dot: 'bg-amber-400', text: 'en cola' },
          { dot: 'bg-red-500', text: 'fallida' },
          { dot: 'bg-white/20', text: 'sin despacho / retiro en tienda' },
        ].map((l) => (
          <span key={l.text} className="inline-flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${l.dot}`} />
            {l.text}
          </span>
        ))}
      </div>

      {/* ── Paginación ─────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 mt-6 flex-wrap">
          {getPaginationPages(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-white/20 select-none">
                ···
              </span>
            ) : (
              <a
                key={p}
                href={`/admin/pedidos?${new URLSearchParams({
                  ...(params.status ? { status: params.status } : {}),
                  page: String(p),
                })}`}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                  p === page
                    ? 'bg-white text-black'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {p}
              </a>
            ),
          )}
        </div>
      )}
    </div>
  )
}
