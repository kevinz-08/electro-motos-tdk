/**
 * Índice de búsqueda del catálogo (README §24).
 *
 * Desde la Fase 2 (docs/seo/), los `tags` de cada documento incluyen las motos
 * compatibles **verificadas** con sus alias: así "pastillas nkd" encuentra las
 * pastillas aunque su nombre no diga "NKD".
 *
 * `buildSearchIndex` lee de Prisma los campos buscables de TODOS los productos no borrados
 * (activos e inactivos, para que el admin también pueda buscar) y los convierte en documentos
 * del motor puro de `@h2r/domain`. `getCachedSearchIndex` lo cachea 5 min con los mismos tags
 * que el resto del catálogo, así que `revalidateTag('products' | 'categories')` lo invalida.
 *
 * Los documentos son JSON puro: `unstable_cache` los serializa sin problema. Con un catálogo de
 * cientos de productos el índice pesa unos pocos cientos de KB; si algún día supera ~2 MB
 * (límite de entrada del Data Cache de Next) hay que pasar a pg_trgm (ver README §24).
 */
import { unstable_cache } from 'next/cache'
import { buildSearchDoc, type SearchDoc } from '@h2r/domain'
import { prisma } from '@/infrastructure/database/prisma-client'
import { CACHE_TAGS } from './cache-tags'

/** Lee la BD y arma el índice completo. Sin caché: úsalo para el panel admin. */
export async function buildSearchIndex(): Promise<SearchDoc[]> {
  const rows = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      sku: true,
      description: true,
      price: true,
      stock: true,
      isActive: true,
      categoryId: true,
      createdAt: true,
      category: { select: { name: true, parent: { select: { name: true } } } },
      // Compatibilidades verificadas: alimentan el buscador con el nombre del
      // modelo y sus alias, para que "pastillas nkd" o "kit arrastre boxer"
      // encuentren el producto aunque el nombre no mencione la moto
      // (docs/seo/, Fase 2).
      fitments: {
        where: { verified: true },
        select: {
          model: { select: { name: true, aliases: true, brand: { select: { name: true } } } },
        },
      },
    },
  })

  return rows.map((p) =>
    buildSearchDoc({
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      price: p.price,
      stock: p.stock,
      isActive: p.isActive,
      categoryId: p.categoryId,
      categoryName: p.category?.name,
      parentCategoryName: p.category?.parent?.name,
      tags: p.fitments.flatMap((f) => [
        `${f.model.brand.name} ${f.model.name}`,
        f.model.name,
        ...f.model.aliases,
      ]),
      createdAt: p.createdAt.getTime(),
    }),
  )
}

/** Índice cacheado para la tienda pública. */
export const getCachedSearchIndex = unstable_cache(buildSearchIndex, ['search-index'], {
  revalidate: 300,
  tags: [CACHE_TAGS.products, CACHE_TAGS.categories],
})
