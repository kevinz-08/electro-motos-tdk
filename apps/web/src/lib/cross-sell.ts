/**
 * Lectura pública de la venta cruzada (docs/seo/plan-venta-cruzada.md).
 *
 * Solo SSR/route handlers: lee Prisma directo, como el resto de las lecturas de
 * la tienda. Devuelve únicamente lo que se puede comprar hoy (activo, no
 * borrado, con stock). El filtro por la moto del comprador NO se hace aquí — se
 * hace en el cliente con `isCrossSellCompatible` — para que la ficha siga
 * siendo estática (ver `lib/my-motorcycle.ts`); por eso cada sugerencia lleva
 * sus modelos con compatibilidad verificada.
 */
import { prisma } from '@/infrastructure/database/prisma-client'
import {
  MAX_CROSS_SELLS,
  isCrossSellVisible,
  type CrossSellModelRef,
} from '@h2r/domain'

/** Sugerencia lista para pintar y para agregar al carrito. Serializable. */
export interface CrossSellSuggestion {
  /** Id del producto sugerido. */
  id: string
  name: string
  slug: string
  sku: string
  /** Centavos COP, leído vivo del producto. */
  price: number
  compareAtPrice: number | null
  stock: number
  images: string[]
  categoryId: string
  /** Motivo escrito por el admin. Null = solo el título del bloque. */
  reason: string | null
  /** Modelos con compatibilidad VERIFICADA. Vacío = producto sin fitments cargados. */
  models: CrossSellModelRef[]
}

/** Sugerencias visibles de un producto, en el orden definido por el admin. */
export async function findCrossSellSuggestions(productId: string): Promise<CrossSellSuggestion[]> {
  const rows = await prisma.productCrossSell.findMany({
    where: {
      productId,
      related: { isActive: true, deletedAt: null, stock: { gt: 0 } },
    },
    orderBy: { order: 'asc' },
    take: MAX_CROSS_SELLS,
    select: {
      reason: true,
      related: {
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          price: true,
          compareAtPrice: true,
          stock: true,
          images: true,
          categoryId: true,
          isActive: true,
          deletedAt: true,
          fitments: {
            where: { verified: true },
            select: {
              yearFrom: true,
              yearTo: true,
              model: { select: { slug: true, brand: { select: { slug: true } } } },
            },
          },
        },
      },
    },
  })

  return rows
    .filter((r) => isCrossSellVisible(r.related))
    .map((r) => ({
      id: r.related.id,
      name: r.related.name,
      slug: r.related.slug,
      sku: r.related.sku,
      price: r.related.price,
      compareAtPrice: r.related.compareAtPrice,
      stock: r.related.stock,
      images: r.related.images,
      categoryId: r.related.categoryId,
      reason: r.reason,
      models: r.related.fitments.map((f) => ({
        brandSlug: f.model.brand.slug,
        modelSlug: f.model.slug,
        yearFrom: f.yearFrom,
        yearTo: f.yearTo,
      })),
    }))
}
