import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { prisma } from '@/infrastructure/database/prisma-client'
import { DeleteProductButton } from '@/components/admin/DeleteProductButton'

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>
}

export default async function AdminProductosPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page ?? 1)

  const repo = new PrismaProductRepository()
  const { items, total, limit } = await repo.findAll({
    search: params.search,
    page,
    limit: 20,
  })

  const categories = await prisma.category.findMany()
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-white/25 uppercase mb-1">
            Catálogo
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">Productos</h1>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo producto
        </Link>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <form method="GET">
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
          <input
            type="text"
            name="search"
            defaultValue={params.search}
            placeholder="Buscar por nombre, SKU..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </form>

      {/* ── Tabla ──────────────────────────────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Producto', 'SKU', 'Categoría', 'Precio', 'Stock', 'Estado', ''].map((h) => (
                <th
                  key={h}
                  className={`px-5 py-4 text-[11px] font-semibold tracking-[0.12em] text-white/20 uppercase ${
                    h === 'Precio' ? 'text-right' : h === 'Stock' || h === 'Estado' ? 'text-center' : 'text-left'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const category = categories.find((c) => c.id === p.categoryId)
              return (
                <tr
                  key={p.id}
                  className="group border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3.5 font-medium text-white/80 max-w-[240px]">
                    <p className="truncate">{p.name}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-white/30 tracking-wider">{p.sku}</span>
                  </td>
                  <td className="px-5 py-3.5 text-white/35 text-xs">
                    {category?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-white/70 tabular-nums">
                    {formatCOP(p.price)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`text-sm font-bold tabular-nums ${
                      p.stock === 0 ? 'text-red-400'
                      : p.stock <= 5 ? 'text-amber-400'
                      : 'text-white/60'
                    }`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-emerald-400' : 'bg-white/15'}`} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="flex items-center justify-end gap-3">
                      <DeleteProductButton id={p.id} name={p.name} />
                      <Link
                        href={`/admin/productos/${p.id}`}
                        className="text-xs text-white/20 group-hover:text-white/60 transition-colors font-medium"
                      >
                        Editar →
                      </Link>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="py-20 text-center text-sm text-white/20">
            {params.search ? `Sin resultados para "${params.search}"` : 'No hay productos aún'}
          </div>
        )}
      </div>

      {/* ── Paginación ─────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/admin/productos?${new URLSearchParams({ ...(params.search ? { search: params.search } : {}), page: String(p) })}`}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                p === page
                  ? 'bg-white text-black'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5'
              }`}
            >
              {p}
            </a>
          ))}
          {totalPages > 7 && (
            <span className="text-xs text-white/20 px-2">··· {totalPages} páginas</span>
          )}
        </div>
      )}
    </div>
  )
}
