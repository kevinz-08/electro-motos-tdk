import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { StockUpdateForm } from '@/components/admin/StockUpdateForm'
import { CsvStockImport } from '@/components/admin/CsvStockImport'

export default async function AdminStockPage() {
  const repo = new PrismaProductRepository()
  const lowStockProducts = await repo.findLowStock(5)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock bajo</h1>
        <CsvStockImport />
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Productos con {' '}
        <span className="font-semibold text-red-600">5 o menos unidades</span> en stock.
      </p>

      {lowStockProducts.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <p className="text-green-700 font-medium">✅ Todo el inventario está en niveles normales</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Producto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">SKU</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700">Stock actual</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Actualizar stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lowStockProducts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs">
                    <p className="line-clamp-1">{p.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold text-lg ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StockUpdateForm productId={p.id} currentStock={p.stock} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
