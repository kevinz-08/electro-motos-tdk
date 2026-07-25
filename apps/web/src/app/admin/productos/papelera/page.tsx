import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { RestoreProductButton } from '@/components/admin/RestoreProductButton'

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export default async function PapeleraProductosPage() {
  const repo = new PrismaProductRepository()
  const items = await repo.findDeleted()

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/25 uppercase mb-1">
            Catálogo
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Papelera de productos</h1>
          <p className="text-sm text-white/30 mt-1">
            {items.length === 0
              ? 'No hay productos eliminados'
              : `${items.length} producto${items.length === 1 ? '' : 's'} en la papelera`}
          </p>
        </div>
        <Link
          href="/admin/productos"
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a productos
        </Link>
      </div>

      {/* ── Tabla ──────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
        {items.length === 0 ? (
          <div className="py-20 text-center">
            <Trash2 className="w-8 h-8 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/20">La papelera está vacía</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Producto', 'SKU', 'Precio', 'Eliminado el', ''].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-4 text-[11px] font-semibold tracking-[0.12em] text-white/20 uppercase ${
                      h === 'Precio' ? 'text-right' : h === '' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr
                  key={p.id}
                  className="group border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3.5 font-medium text-white/50 max-w-[260px]">
                    <p className="truncate">{p.name}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-white/20 tracking-wider">{p.sku}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-white/40 tabular-nums">
                    {formatCOP(p.price)}
                  </td>
                  <td className="px-5 py-3.5 text-white/25 text-xs">
                    {formatDate(p.deletedAt)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <RestoreProductButton id={p.id} name={p.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
