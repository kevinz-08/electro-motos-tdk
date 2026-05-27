import Link from 'next/link'
import { TrendingUp, Clock, AlertTriangle, ShoppingBag, ArrowRight, Dot } from 'lucide-react'
import { PrismaOrderRepository } from '@/infrastructure/repositories/PrismaOrderRepository'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { RevenueChart } from '@/components/admin/RevenueChart'

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

const statusConfig: Record<string, { label: string; dot: string }> = {
  PENDING:   { label: 'Pendiente', dot: 'bg-amber-400' },
  PAID:      { label: 'Pagado',    dot: 'bg-emerald-400' },
  SHIPPED:   { label: 'Enviado',   dot: 'bg-blue-400' },
  DELIVERED: { label: 'Entregado', dot: 'bg-white/40' },
  CANCELLED: { label: 'Cancelado', dot: 'bg-red-400' },
}

export default async function AdminDashboard() {
  const orderRepo = new PrismaOrderRepository()
  const productRepo = new PrismaProductRepository()

  const [
    todayRevenue,
    monthRevenue,
    pendingCount,
    totalOrders,
    weeklySeries,
    lowStockProducts,
    recentOrders,
  ] = await Promise.all([
    orderRepo.getTodayRevenue(),
    orderRepo.getMonthRevenue(),
    orderRepo.getPendingCount(),
    orderRepo.getTotalCount(),
    orderRepo.getWeeklyRevenueSeries(),
    productRepo.findLowStock(5),
    orderRepo.findAll({ limit: 6 }),
  ])

  const kpis = [
    {
      label: 'Ingresos hoy',
      value: formatCOP(todayRevenue),
      Icon: TrendingUp,
      sub: 'Pedidos pagados hoy',
    },
    {
      label: 'Ingresos del mes',
      value: formatCOP(monthRevenue),
      Icon: TrendingUp,
      sub: 'Desde el 1° del mes',
    },
    {
      label: 'Pedidos pendientes',
      value: String(pendingCount),
      Icon: Clock,
      sub: pendingCount === 0 ? 'Sin pendientes' : 'Requieren atención',
      alert: pendingCount > 0,
    },
    {
      label: 'Total de pedidos',
      value: String(totalOrders),
      Icon: ShoppingBag,
      sub: 'Histórico total',
    },
  ]

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] text-white/25 uppercase mb-1">
          Panel de control
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-white/30 uppercase">
                {kpi.label}
              </p>
              <kpi.Icon className={`w-4 h-4 ${kpi.alert ? 'text-amber-400' : 'text-white/15'}`} />
            </div>
            <p className={`text-2xl font-bold tracking-tight ${kpi.alert ? 'text-amber-400' : 'text-white'}`}>
              {kpi.value}
            </p>
            <p className="text-xs text-white/25">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Chart + Stock bajo ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue chart — 2/3 del ancho */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-white/30 uppercase mb-1">
                Ingresos
              </p>
              <p className="text-sm text-white/60">Últimos 7 días</p>
            </div>
          </div>
          <RevenueChart data={weeklySeries} />
        </div>

        {/* Stock bajo — 1/3 */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-white/30 uppercase mb-1">
                Stock bajo
              </p>
              <p className="text-sm text-white/60">&lt; 5 unidades</p>
            </div>
            {lowStockProducts.length > 0 && (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-white/20">Todo el inventario</p>
              <p className="text-sm text-white/20">está en niveles normales</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white/70 truncate leading-tight">{p.name}</p>
                    <p className="text-xs text-white/25 font-mono">{p.sku}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 tabular-nums ${p.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    {p.stock === 0 ? '—' : `${p.stock}u`}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/admin/stock"
            className="flex items-center gap-1 mt-5 pt-4 border-t border-white/[0.06] text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Gestionar inventario <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Pedidos recientes ───────────────────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] text-white/30 uppercase mb-1">
              Actividad reciente
            </p>
            <p className="text-sm text-white/60">Últimos pedidos</p>
          </div>
          <Link
            href="/admin/pedidos"
            className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-16 text-center text-sm text-white/20">Sin pedidos aún</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left px-6 py-3 text-[11px] font-semibold tracking-[0.12em] text-white/20 uppercase">Pedido</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-[0.12em] text-white/20 uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold tracking-[0.12em] text-white/20 uppercase">Estado</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold tracking-[0.12em] text-white/20 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => {
                const sc = statusConfig[order.status] ?? { label: order.status, dot: 'bg-white/20' }
                return (
                  <tr key={order.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-xs text-white/60 tracking-wider">
                        #{order.id.slice(-8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-white/30">
                      {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1.5 text-xs text-white/50">
                        <Dot className={`w-3 h-3 ${sc.dot} rounded-full`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-white text-sm tabular-nums">
                      {formatCOP(order.total)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
