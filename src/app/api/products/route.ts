import { NextRequest } from 'next/server'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { ListProducts } from '@/domain/use-cases/products/ListProducts'

/**
 * GET /api/products
 *
 * Endpoint público para listar productos con filtros y paginación.
 * No requiere autenticación — es accesible para cualquier usuario o integración externa.
 *
 * Query params aceptados (todos opcionales):
 *   category  → slug de categoría (ej: "frenos", "motores", "llantas")
 *   search    → texto libre buscado en nombre, descripción y SKU (case-insensitive)
 *   minPrice  → precio mínimo en centavos COP (ej: 5000000 para $50.000 mínimo)
 *   maxPrice  → precio máximo en centavos COP
 *   inStock   → "true" para solo productos con stock > 0
 *   page      → número de página (empieza en 1, default: 1)
 *   limit     → productos por página (default: 12)
 *
 * Ejemplo de request:
 *   GET /api/products?category=frenos&search=yamaha&inStock=true&page=1&limit=6
 *
 * Respuesta 200:
 *   {
 *     "items": [...],    ← array de productos
 *     "total": 42,       ← total de resultados (para calcular páginas)
 *     "page": 1,
 *     "limit": 12
 *   }
 *
 * Este endpoint es usado principalmente por la página del catálogo del servidor,
 * pero puede ser consumido por cualquier cliente externo (app móvil, integración, etc.)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const repo = new PrismaProductRepository()
  const useCase = new ListProducts(repo)

  const result = await useCase.execute({
    categorySlug: params.get('category') ?? undefined,
    search: params.get('search') ?? undefined,
    minPrice: params.get('minPrice') ? Number(params.get('minPrice')) : undefined,
    maxPrice: params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined,
    inStock: params.get('inStock') === 'true' ? true : undefined,
    page: params.get('page') ? Number(params.get('page')) : undefined,
    limit: params.get('limit') ? Number(params.get('limit')) : undefined,
  })

  if (!result.ok) {
    return Response.json({ error: result.error.message }, { status: 500 })
  }

  return Response.json(result.value)
}
