import { PrismaOrderRepository } from '@/infrastructure/repositories/PrismaOrderRepository'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import Link from 'next/link'

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pendiente', color: 'bg-amber-500/20 text-amber-400' },
  PAID:      { label: 'Pagado',    color: 'bg-green-500/20 text-green-400' },
  SHIPPED:   { label: 'Enviado',   color: 'bg-blue-500/20 text-blue-400' },
  DELIVERED: { label: 'Entregado', color: 'bg-purple-500/20 text-purple-400' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
}

export default async function AdminDashboard() {
  const orderRepo = new PrismaOrderRepository()
  const productRepo = new PrismaProductRepository()

  const [todayRevenue, pendingCount, lowStockProducts, recentOrders] = await Promise.all([
    orderRepo.getTodayRevenue(),
    orderRepo.getPendingCount(),
    productRepo.findLowStock(5),
    orderRepo.findAll({ limit: 5 }),
  ])

  const metrics = [
    {
      label: 'Ingresos hoy',
      value: formatCOP(todayRevenue),
      icon: '💰',
      accent: 'text-green-400',
    },
    {
      label: 'Pedidos pendientes',
      value: String(pendingCount),
      icon: '📦',
      accent: pendingCount > 0 ? 'text-amber-400' : 'text-white/40',
    },
    {
      label: 'Stock bajo',
      value: String(lowStockProducts.length),
      icon: '⚠️',
      accent: lowStockProducts.length > 0 ? 'text-red-400' : 'text-white/40',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white/5 border border-white/10 rounded-xl p-6">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-3">{m.label}</p>
            <p className={`text-3xl font-bold ${m.accent}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos recientes */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white">Pedidos recientes</h2>
            <Link href="/admin/pedidos" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-white/30">No hay pedidos aún</p>
            ) : (
              recentOrders.map((order) => {
                const status = statusLabels[order.status] ?? { label: order.status, color: 'bg-white/10 text-white/50' }
                return (
                  <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-white">
                        #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-white/30">
                        {order.paymentProvider} · {new Date(order.createdAt).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {formatCOP(order.total)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Stock bajo */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-white">Stock bajo (&lt;5 unidades)</h2>
            <Link href="/admin/stock" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Gestionar →
            </Link>
          </div>
          <div className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-white/30">Todo el stock está bien ✅</p>
            ) : (
              lowStockProducts.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white line-clamp-1">{p.name}</p>
                    <p className="text-xs text-white/30">SKU: {p.sku}</p>
                  </div>
                  <span className={`text-sm font-bold ${p.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    {p.stock === 0 ? 'Agotado' : `${p.stock} u.`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
