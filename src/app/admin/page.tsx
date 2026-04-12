/**
 * Dashboard del panel de administración.
 *
 * Página principal del admin — lo primero que ve el administrador al ingresar.
 * Es un Server Component: todos los datos se obtienen en el servidor sin waterfalls.
 *
 * Usa Promise.all para hacer 4 consultas a la BD en PARALELO (no en serie).
 * Esto es más eficiente que await una por una:
 *
 *   Sin Promise.all (400ms total):
 *     await getTodayRevenue()    // 100ms
 *     await getPendingCount()    // 100ms
 *     await findLowStock(5)      // 100ms
 *     await findAll({ limit:5 }) // 100ms
 *
 *   Con Promise.all (100ms total):
 *     await Promise.all([...todas las consultas...])
 *
 * Métricas mostradas:
 *   💰 Ingresos hoy    → SUM(total) WHERE status=PAID AND createdAt>=hoy
 *   📦 Pedidos pendientes → COUNT WHERE status=PENDING
 *   ⚠️  Stock bajo       → COUNT WHERE stock<=5 AND isActive=true
 *
 * Cards adicionales:
 *   - Últimos 5 pedidos con estado y monto
 *   - Primeros 5 productos con stock bajo y sus SKUs
 */
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

/** Dashboard admin — métricas en tiempo real */
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
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Pedidos pendientes',
      value: String(pendingCount),
      icon: '📦',
      color: pendingCount > 0 ? 'text-amber-600 bg-amber-50' : 'text-gray-600 bg-gray-50',
    },
    {
      label: 'Productos con stock bajo',
      value: String(lowStockProducts.length),
      icon: '⚠️',
      color: lowStockProducts.length > 0 ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50',
    },
  ]

  const statusLabels: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
    PAID: { label: 'Pagado', color: 'bg-green-100 text-green-700' },
    SHIPPED: { label: 'Enviado', color: 'bg-blue-100 text-blue-700' },
    DELIVERED: { label: 'Entregado', color: 'bg-purple-100 text-purple-700' },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${m.color} mb-3`}>
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos recientes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Pedidos recientes</h2>
            <Link href="/admin/pedidos" className="text-sm text-amber-600 hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400">No hay pedidos aún</p>
            ) : (
              recentOrders.map((order) => {
                const status = statusLabels[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600' }
                return (
                  <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.paymentProvider} · {new Date(order.createdAt).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Stock bajo (&lt;5 unidades)</h2>
            <Link href="/admin/stock" className="text-sm text-amber-600 hover:underline">
              Gestionar →
            </Link>
          </div>
          <div className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-gray-400">Todo el stock está bien ✅</p>
            ) : (
              lowStockProducts.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-gray-400">SKU: {p.sku}</p>
                  </div>
                  <span className={`text-sm font-bold ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
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
