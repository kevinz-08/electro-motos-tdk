import { PrismaOrderRepository } from '@/infrastructure/repositories/PrismaOrderRepository'
import { OrderStatus } from '@/domain/entities/Order'
import { OrderStatusSelect } from '@/components/admin/OrderStatusSelect'

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
  PENDING: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  PAID: { label: 'Pagado', color: 'bg-green-100 text-green-700' },
  SHIPPED: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
  DELIVERED: { label: 'Entregado', color: 'bg-purple-100 text-purple-700' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pedidos</h1>

      {/* Filtro por estado */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[undefined, 'PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
          <a
            key={s ?? 'all'}
            href={s ? `/admin/pedidos?status=${s}` : '/admin/pedidos'}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              params.status === s || (!params.status && !s)
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            {s ? statusConfig[s]?.label : 'Todos'}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Pedido</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Fecha</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Pasarela</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Total</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700">Estado</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Cambiar estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => {
              const sc = statusConfig[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-900 font-medium">
                    #{order.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-600">
                      {providerLabels[order.paymentProvider] ?? order.paymentProvider}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{formatCOP(order.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-400">No hay pedidos</div>
        )}
      </div>
    </div>
  )
}
