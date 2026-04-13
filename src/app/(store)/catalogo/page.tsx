/**
 * Página del catálogo de productos.
 *
 * Es un Server Component: todos los datos se obtienen en el servidor antes de renderizar.
 * Esto significa que los filtros (categoría, búsqueda, precio, stock) funcionan via
 * query params de la URL — no hay estado de React para los filtros.
 *
 * Ejemplo de URL con filtros:
 *   /catalogo?category=frenos&search=yamaha&inStock=true&page=2
 *
 * Componentes de la página:
 *   - Sidebar: lista de categorías (leídas de BD) + checkbox "solo disponibles"
 *   - Buscador: formulario GET que modifica el query param ?search=
 *   - Grid de productos: ProductCard × N
 *   - Paginación: links a ?page=N
 *
 * Flujo de datos:
 *   searchParams → ListProducts use case → PrismaProductRepository → PostgreSQL
 *   → Product[] → grid de ProductCard
 *
 * Los filtros se construyen en el use case y se pasan al repositorio.
 * La paginación calcula skip/take en el repositorio.
 */
import { Suspense } from 'react'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { ListProducts } from '@/domain/use-cases/products/ListProducts'
import { ProductCard } from '@/components/store/ProductCard'
import { prisma } from '@/infrastructure/database/prisma-client'

interface PageProps {
  searchParams: Promise<{
    category?: string
    search?: string
    page?: string
    minPrice?: string
    maxPrice?: string
    inStock?: string
  }>
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params.page ?? 1)

  const repo = new PrismaProductRepository()
  const useCase = new ListProducts(repo)

  const result = await useCase.execute({
    categorySlug: params.category,
    search: params.search,
    page,
    limit: 12,
    inStock: params.inStock === 'true' ? true : undefined,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
  })

  const categories = await prisma.category.findMany()

  const { items, total, limit } = result.ok
    ? result.value
    : { items: [], total: 0, limit: 12 }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar filtros */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-bold text-gray-900 mb-4">Filtros</h2>

            {/* Categorías */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Categoría</h3>
              <ul className="space-y-1">
                <li>
                  <a
                    href="/catalogo"
                    className={`text-sm block px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-700 ${!params.category ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-600'}`}
                  >
                    Todas
                  </a>
                </li>
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <a
                      href={`/catalogo?category=${cat.slug}`}
                      className={`text-sm block px-2 py-1 rounded hover:bg-blue-50 hover:text-blue-700 ${params.category === cat.slug ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-600'}`}
                    >
                      {cat.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* En stock */}
            <div>
              <a
                href={`/catalogo?${new URLSearchParams({ ...params, inStock: params.inStock === 'true' ? '' : 'true' }).toString()}`}
                className={`text-sm flex items-center gap-2 ${params.inStock === 'true' ? 'text-amber-600 font-semibold' : 'text-gray-600'}`}
              >
                <span className={`w-4 h-4 rounded border ${params.inStock === 'true' ? 'bg-amber-400 border-amber-400' : 'border-gray-300'}`} />
                Solo disponibles
              </a>
            </div>
          </div>
        </aside>

        {/* Productos */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white-900">
              {params.category
                ? categories.find((c) => c.slug === params.category)?.name ?? 'Catálogo'
                : 'Todo el catálogo'}
            </h1>
            <p className="text-sm text-gray-500">{total} productos</p>
          </div>

          {/* Buscador */}
          <form method="GET" className="mb-6">
            {params.category && (
              <input type="hidden" name="category" value={params.category} />
            )}
            <div className="flex gap-2">
              <input
                type="text"
                name="search"
                defaultValue={params.search}
                placeholder="Buscar por nombre, SKU o descripción..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-500 transition-colors"
              >
                Buscar
              </button>
            </div>
          </form>

          {items.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg">No se encontraron productos</p>
              <a href="/catalogo" className="text-amber-600 hover:underline mt-2 block">
                Ver todo el catálogo
              </a>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-10">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <a
                      key={p}
                      href={`/catalogo?${new URLSearchParams({ ...params, page: String(p) }).toString()}`}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        p === page
                          ? 'bg-amber-400 text-gray-900'
                          : 'border border-gray-200 text-gray-600 hover:border-amber-400'
                      }`}
                    >
                      {p}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
