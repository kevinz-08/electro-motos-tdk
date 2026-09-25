/**
 * `/admin/kits` — lista de kits (docs/seo/plan-kits.md, Fase 4 ítem 8).
 *
 * Lee directo de Prisma (patrón SSR admin, como `/admin/productos`) y calcula
 * precio y disponibilidad con las mismas funciones puras del dominio que usa
 * el controlador — nunca dos fórmulas distintas para el mismo número.
 */
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { computeKitAvailability, computeKitPrice } from '@h2r/domain'
import { prisma } from '@/infrastructure/database/prisma-client'

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(cents / 100)
}

export default async function AdminKitsPage() {
  const kits = await prisma.kit.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      model: { select: { name: true, brand: { select: { name: true } } } },
      items: { select: { quantity: true, product: { select: { price: true, stock: true, isActive: true, deletedAt: true } } } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/25 uppercase mb-1">Catálogo</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Kits</h1>
        </div>
        <Link
          href="/admin/kits/nuevo"
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo kit
        </Link>
      </div>

      {kits.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-6 py-16 text-center">
          <p className="text-white/40 text-sm">Todavía no hay kits. Crea el primero para empezar a venderlos.</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Kit', 'Moto', 'Productos', 'Precio', 'Disponibilidad', 'Estado', ''].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-4 text-[11px] font-semibold tracking-[0.12em] text-white/20 uppercase ${
                      h === 'Precio' ? 'text-right' : h === 'Productos' || h === 'Disponibilidad' || h === 'Estado' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kits.map((kit) => {
                const itemsTotal = kit.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
                const availableUnits = computeKitAvailability(kit.items.map((i) => ({ quantity: i.quantity, ...i.product })))
                const price = computeKitPrice(itemsTotal, kit.discountCents)
                return (
                  <tr key={kit.id} className="group border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white/80 max-w-[240px]">
                      <Link href={`/admin/kits/${kit.id}`} className="hover:underline truncate block">{kit.name}</Link>
                    </td>
                    <td className="px-5 py-3.5 text-white/35 text-xs">
                      {kit.model ? `${kit.model.brand.name} ${kit.model.name}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center text-white/50">{kit.items.length}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-white/70 tabular-nums">
                      {formatCOP(price)}
                      {kit.discountCents > 0 && <p className="text-xs text-white/25 line-through">{formatCOP(itemsTotal)}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-sm font-bold tabular-nums ${availableUnits === 0 ? 'text-red-400' : 'text-white/60'}`}>
                        {availableUnits}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${kit.isActive ? 'bg-emerald-400' : 'bg-white/15'}`} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/admin/kits/${kit.id}`} className="text-white/40 hover:text-white text-xs font-medium transition-colors">
                        Editar
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
