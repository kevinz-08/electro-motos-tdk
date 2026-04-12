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
        <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
        <Link
          href="/admin/productos/nuevo"
          className="bg-amber-400 text-gray-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-300 transition-colors"
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
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-400"
          />
          <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Buscar
          </button>
        </div>
      </form>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Producto</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">SKU</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Categoría</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Precio</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700">Stock</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-700">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((p) => {
              const category = categories.find((c) => c.id === p.categoryId)
              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs">
                    <p className="line-clamp-1">{p.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-500">{category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCOP(p.price)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${p.stock === 0 ? 'text-red-600' : p.stock <= 5 ? 'text-amber-600' : 'text-gray-900'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/productos/${p.id}`}
                      className="text-amber-600 hover:underline text-xs"
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
          <div className="text-center py-12 text-gray-400">No se encontraron productos</div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/admin/productos?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium ${p === page ? 'bg-amber-400 text-gray-900' : 'border border-gray-200 text-gray-600 hover:border-amber-400'}`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
