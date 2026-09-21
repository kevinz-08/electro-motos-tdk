/**
 * Implementación de IProductRepository usando Prisma 7 + PostgreSQL (Neon).
 *
 * Patrón de mapeo: cada función privada `toDomain` convierte el tipo
 * de Prisma al tipo de dominio puro, desacoplando el dominio de Prisma.
 * Los use cases nunca ven tipos de Prisma.
 */
import {
  prisma,
  type ProductModel as PrismaProduct,
  type MotorcycleCompatibilityModel as PrismaCompat,
} from '@h2r/database'
import {
  IProductRepository,
  PaginatedProducts,
  Product,
  ProductFilters,
  MotorcycleCompatibility,
  searchDocs,
  tokenizeQuery,
} from '@h2r/domain'
import { buildSearchIndex, getCachedSearchIndex } from '@/lib/search-index'

/**
 * Convierte un registro de Prisma (con `compatible` y `category` incluidos) a la entidad de dominio Product.
 * Esto centraliza el mapeo: si el schema cambia, solo se actualiza aquí.
 */
function toDomain(
  p: PrismaProduct & { compatible?: PrismaCompat[]; category?: { parentId: string | null } | null },
): Product {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,          // centavos COP, sin conversión
    compareAtPrice: p.compareAtPrice, // precio ancla tachado — null si no hay
    stock: p.stock,
    soldCount: p.soldCount,
    storeRecommendations: p.storeRecommendations,
    sku: p.sku,
    images: p.images,        // array de URLs de Cloudinary
    isActive: p.isActive,
    weightKg: p.weightKg,
    heightCm: p.heightCm,
    widthCm: p.widthCm,
    lengthCm: p.lengthCm,
    categoryId: p.categoryId,
    parentCategoryId: p.category?.parentId ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    deletedAt: p.deletedAt,
    compatible: p.compatible?.map(
      (c): MotorcycleCompatibility => ({
        id: c.id,
        brand: c.brand,
        model: c.model,
        year: c.year,
      }),
    ),
  }
}

/** Implementación de acceso a datos de productos con Prisma */
export class PrismaProductRepository implements IProductRepository {

  /** Busca un producto por su ID único (cuid) */
  async findById(id: string): Promise<Product | null> {
    const p = await prisma.product.findUnique({
      where: { id, deletedAt: null },
      include: { compatible: true, category: { select: { parentId: true } } },
    })
    return p ? toDomain(p) : null
  }

  /** Busca un producto por su slug único (usado en rutas /producto/[slug]) */
  async findBySlug(slug: string): Promise<Product | null> {
    const p = await prisma.product.findUnique({
      where: { slug, deletedAt: null },
      include: { compatible: true, category: { select: { parentId: true } } },
    })
    return p ? toDomain(p) : null
  }

  /** Busca un producto por su SKU único (usado en importaciones de stock) */
  async findBySku(sku: string): Promise<Product | null> {
    const p = await prisma.product.findUnique({
      where: { sku, deletedAt: null },
      include: { compatible: true, category: { select: { parentId: true } } },
    })
    return p ? toDomain(p) : null
  }

  /**
   * Lista productos con filtros opcionales y paginación.
   *
   * Construcción del filtro `where`:
   * - Filtra isActive: true, salvo que `includeInactive: true` (uso exclusivo del panel admin,
   *   que necesita ver también los productos desactivados para poder gestionarlos).
   * - `inStock: true` agrega `stock > 0`.
   * - `categorySlug` soporta jerarquía de dos niveles:
   *     Si el slug es una categoría PADRE, incluye automáticamente los IDs
   *     de todas sus subcategorías hijas (una consulta extra por llamada).
   *     Si es una subcategoría (leaf), filtra solo por su ID.
   * - `minPrice` / `maxPrice` filtran por rango de precio en centavos.
   * - `search` delega en el índice de búsqueda (README §24): normaliza, tolera typos y
   *   ordena por relevancia. Los demás filtros se aplican sobre el índice, no sobre Prisma.
   */
  async findAll(filters: ProductFilters): Promise<PaginatedProducts> {
    const page  = filters.page  ?? 1
    const limit = filters.limit ?? 12
    const skip  = (page - 1) * limit

    // Resolver IDs de categoría con expansión padre → hijos
    let categoryIds: string[] | undefined
    if (filters.categorySlug) {
      const cat = await prisma.category.findUnique({
        where: { slug: filters.categorySlug },
        include: { children: { select: { id: true } } },
      })
      if (cat) categoryIds = [cat.id, ...cat.children.map((c) => c.id)]
    }

    if (filters.search && tokenizeQuery(filters.search).length > 0) {
      return this.findBySearch(filters, categoryIds, page, limit)
    }

    const priceRange = {
      ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
      ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
    }
    const where = {
      deletedAt: null,
      ...(!filters.includeInactive && { isActive: true }),
      ...(filters.inStock && { stock: { gt: 0 } }),
      ...(Object.keys(priceRange).length > 0 && { price: priceRange }),
      ...(categoryIds && { categoryId: { in: categoryIds } }),
    }

    // Promise.all — count + findMany en paralelo
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { compatible: true, category: { select: { parentId: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ])

    return { items: items.map(toDomain), total, page, limit }
  }

  /**
   * Rama de `findAll` con texto de búsqueda: rankea sobre el índice en memoria, pagina los ids
   * y trae de Prisma solo la página pedida, conservando el orden por relevancia.
   * El panel admin reconstruye el índice (sin caché) para ver sus cambios al instante.
   */
  private async findBySearch(
    filters: ProductFilters,
    categoryIds: string[] | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedProducts> {
    const index = filters.includeInactive ? await buildSearchIndex() : await getCachedSearchIndex()
    const categorySet = categoryIds ? new Set(categoryIds) : undefined

    const hits = searchDocs(index, filters.search!, {
      filter: (d) =>
        (filters.includeInactive || d.isActive) &&
        (!filters.inStock || d.stock > 0) &&
        (filters.minPrice === undefined || d.price >= filters.minPrice) &&
        (filters.maxPrice === undefined || d.price <= filters.maxPrice) &&
        (!categorySet || categorySet.has(d.categoryId)),
    })

    const pageIds = hits.slice((page - 1) * limit, page * limit).map((h) => h.id)
    if (pageIds.length === 0) return { items: [], total: hits.length, page, limit }

    const rows = await prisma.product.findMany({
      where: { id: { in: pageIds }, deletedAt: null },
      include: { compatible: true, category: { select: { parentId: true } } },
    })
    const byId = new Map(rows.map((r) => [r.id, r]))
    const items = pageIds.flatMap((id) => {
      const row = byId.get(id)
      return row ? [toDomain(row)] : []
    })

    return { items, total: hits.length, page, limit }
  }

  /**
   * Retorna productos con stock menor o igual al umbral.
   * Usado en el dashboard admin para alertas de stock bajo.
   */
  async findLowStock(threshold: number): Promise<Product[]> {
    const items = await prisma.product.findMany({
      where: { stock: { lte: threshold }, isActive: true, deletedAt: null },
      include: { compatible: true, category: { select: { parentId: true } } },
      orderBy: { stock: 'asc' },
    })
    return items.map(toDomain)
  }

  /** Crea un nuevo producto. Los ids de compatibilidad se ignoran en la creación. */
  async save(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const p = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: data.price,
        compareAtPrice: data.compareAtPrice ?? null,
        stock: data.stock,
        sku: data.sku,
        images: data.images,
        isActive: data.isActive,
        weightKg: data.weightKg ?? null,
        heightCm: data.heightCm ?? null,
        widthCm: data.widthCm ?? null,
        lengthCm: data.lengthCm ?? null,
        categoryId: data.categoryId,
        compatible: data.compatible
          // Omitimos el id al crear — Prisma genera uno nuevo
          ? { create: data.compatible.map(({ id: _id, ...c }) => c) }
          : undefined,
      },
      include: { compatible: true },
    })
    return toDomain(p)
  }

  /**
   * Actualiza campos individuales de un producto.
   * Solo se incluyen en la query los campos que vienen definidos en `data`.
   */
  async update(id: string, data: Partial<Product>): Promise<Product> {
    const p = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.compareAtPrice !== undefined && { compareAtPrice: data.compareAtPrice }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.weightKg !== undefined && { weightKg: data.weightKg }),
        ...(data.heightCm !== undefined && { heightCm: data.heightCm }),
        ...(data.widthCm !== undefined && { widthCm: data.widthCm }),
        ...(data.lengthCm !== undefined && { lengthCm: data.lengthCm }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      },
      include: { compatible: true },
    })
    return toDomain(p)
  }

  /** Actualiza solo el campo stock de un producto (operación frecuente) */
  async updateStock(id: string, newStock: number): Promise<void> {
    await prisma.product.update({
      where: { id },
      data: { stock: newStock },
    })
  }

  /**
   * Decremento atómico del stock en la BD (`UPDATE ... SET stock = stock - $by`).
   * Evita race conditions entre webhooks concurrentes: el cálculo ocurre
   * dentro de la BD bajo el lock de la fila.
   */
  async decrementStock(id: string, by: number): Promise<void> {
    await prisma.product.update({
      where: { id },
      data: { stock: { decrement: by } },
    })
  }

  async softDelete(id: string): Promise<void> {
    await prisma.product.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  async restore(id: string): Promise<void> {
    await prisma.product.update({ where: { id }, data: { deletedAt: null } })
  }

  async findDeleted(): Promise<Product[]> {
    const items = await prisma.product.findMany({
      where: { deletedAt: { not: null } },
      include: { compatible: true, category: { select: { parentId: true } } },
      orderBy: { deletedAt: 'desc' },
    })
    return items.map(toDomain)
  }

  /**
   * Productos de la misma categoría excluyendo un slug dado.
   * Usado en la sección "Relacionados" de la página de detalle.
   * Una sola query con include — no N+1.
   */
  async findRelatedByCategory(
    categoryId: string,
    excludeSlug: string,
    limit = 4,
  ): Promise<Product[]> {
    const items = await prisma.product.findMany({
      where: {
        categoryId,
        isActive: true,
        deletedAt: null,
        stock: { gt: 0 },
        slug: { not: excludeSlug },
      },
      include: { compatible: true, category: { select: { parentId: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return items.map(toDomain)
  }
}
