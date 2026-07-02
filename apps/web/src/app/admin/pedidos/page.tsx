import { PrismaOrderRepository } from '@/infrastructure/repositories/PrismaOrderRepository'
import { OrderStatus } from '@h2r/domain'
import { OrderStatusSelect } from '@/components/admin/OrderStatusSelect'
import { OrderInfoModal } from '@/components/admin/OrderInfoModal'
import { AdminHelpButton } from '@/components/admin/AdminHelpButton'
import { pedidosHelpContent } from '@/components/admin/help-content/pedidos'

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

export default async function AdminPedidosPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page ?? 1)

  const repo = new PrismaOrderRepository()
  const orders = await repo.findAll({
    status: params.status as OrderStatus | undefined,
    page,
    limit: 20,
  })

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
              <th className="px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Cambiar estado</th>
              <th className="px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((order) => {
              const sc = statusConfig[order.status] ?? { label: order.status, color: 'bg-white/10 text-white/50' }
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
                    {order.shippingCod && (
                      <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                        Flete COD
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-white">{formatCOP(order.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                      {sc.label}
                    </span>
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
    </div>
  )
}
