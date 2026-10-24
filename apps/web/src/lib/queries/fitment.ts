/**
 * Lecturas SSR del sistema de compatibilidad (docs/seo/, Fase 2).
 *
 * Los repositorios devuelven IDs de producto (quién es compatible con qué); aquí
 * se hidratan esos IDs a productos completos para pintarlos con `ProductCard`.
 * Se separa así para que el repositorio no dependa de la forma de presentación y
 * para no traer el producto entero cuando solo hace falta contar.
 */
import { unstable_cache } from 'next/cache'
import { prisma } from '@/infrastructure/database/prisma-client'
import type { Product } from '@h2r/domain'
import { CACHE_TAGS } from '@/lib/cache-tags'

/**
 * Productos completos a partir de una lista de IDs, **respetando el orden
 * recibido**. El repositorio ya los ordena por stock y ventas, y `findMany` no
 * garantiza ese orden, así que se reordena en memoria.
 *
 * Con la lista vacía no consulta la base de datos.
 */
async function loadProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return []

  const rows = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true, deletedAt: null },
  })

  const byId = new Map(rows.map((p) => [p.id, p]))

  return ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      stock: p.stock,
      soldCount: p.soldCount,
      storeRecommendations: p.storeRecommendations,
      sku: p.sku,
      images: p.images,
      isActive: p.isActive,
      categoryId: p.categoryId,
      weightKg: p.weightKg,
      heightCm: p.heightCm,
      widthCm: p.widthCm,
      lengthCm: p.lengthCm,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
}

/**
 * Cacheado sin TTL (README §27): los hubs de modelo y `/referencia/[oem]` lo
 * llamaban sin caché en cada regeneración. La lista de IDs forma parte de la clave.
 */
export const getProductsByIds = unstable_cache(loadProductsByIds, ['products-by-ids'], {
  revalidate: false,
  tags: [CACHE_TAGS.products],
})
