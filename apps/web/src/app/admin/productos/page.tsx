import Link from 'next/link'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { prisma } from '@/infrastructure/database/prisma-client'

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Productos</h1>
        <Link
          href="/admin/productos/nuevo"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors"
        >
          + Nuevo producto
        </Link>
      </div>

      {/* Búsqueda */}
      <form method="GET" className="mb-6">
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            name="search"
            defaultValue={params.search}
            placeholder="Buscar por nombre, SKU..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            className="bg-white/10 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/15 transition-colors"
          >
            Buscar
          </button>
        </div>
      </form>

      {/* Tabla */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Producto</th>
              <th className="text-left px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">SKU</th>
              <th className="text-left px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Categoría</th>
              <th className="text-right px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Precio</th>
              <th className="text-center px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Stock</th>
              <th className="text-center px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((p) => {
              const category = categories.find((c) => c.id === p.categoryId)
              return (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white max-w-xs">
                    <p className="line-clamp-1">{p.name}</p>
                  </td>
                  <td className="px-4 py-3 text-white/40 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 text-white/50">{category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-white font-medium">{formatCOP(p.price)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${p.stock === 0 ? 'text-red-400' : p.stock <= 5 ? 'text-amber-400' : 'text-white'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/productos/${p.id}`}
                      className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="text-center py-12 text-white/30">No se encontraron productos</div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/admin/productos?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-white/10 text-white/50 hover:border-blue-500 hover:text-white'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
