import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { StockUpdateForm } from '@/components/admin/StockUpdateForm'
import { CsvStockImport } from '@/components/admin/CsvStockImport'

export default async function AdminStockPage() {
  const repo = new PrismaProductRepository()
  const lowStockProducts = await repo.findLowStock(5)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Stock bajo</h1>
        <CsvStockImport />
      </div>

      <p className="text-sm text-white/40 mb-6">
        Productos con{' '}
        <span className="font-semibold text-red-400">5 o menos unidades</span> en stock.
      </p>

      {lowStockProducts.length === 0 ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center">
          <p className="text-green-400 font-medium">✅ Todo el inventario está en niveles normales</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Producto</th>
                <th className="text-left px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">SKU</th>
                <th className="text-center px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Stock actual</th>
                <th className="px-4 py-3 font-semibold text-white/50 text-xs uppercase tracking-wide">Actualizar stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {lowStockProducts.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white max-w-xs">
                    <p className="line-clamp-1">{p.name}</p>
                  </td>
                  <td className="px-4 py-3 text-white/40 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold text-lg ${p.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
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
