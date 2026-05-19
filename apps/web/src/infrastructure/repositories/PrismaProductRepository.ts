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
} from '@h2r/domain'

/**
 * Convierte un registro de Prisma (con `compatible` incluido) a la entidad de dominio Product.
 * Esto centraliza el mapeo: si el schema cambia, solo se actualiza aquí.
 */
function toDomain(
  p: PrismaProduct & { compatible?: PrismaCompat[] },
): Product {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,          // centavos COP, sin conversión
    stock: p.stock,
    sku: p.sku,
    images: p.images,        // array de URLs de Cloudinary
    isActive: p.isActive,
    categoryId: p.categoryId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
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
      where: { id },
      include: { compatible: true },
    })
    return p ? toDomain(p) : null
  }

  /** Busca un producto por su slug único (usado en rutas /producto/[slug]) */
  async findBySlug(slug: string): Promise<Product | null> {
    const p = await prisma.product.findUnique({
      where: { slug },
      include: { compatible: true },
    })
    return p ? toDomain(p) : null
  }

  /** Busca un producto por su SKU único (usado en importaciones de stock) */
  async findBySku(sku: string): Promise<Product | null> {
    const p = await prisma.product.findUnique({
      where: { sku },
      include: { compatible: true },
    })
    return p ? toDomain(p) : null
  }

  /**
   * Lista productos con filtros opcionales y paginación.
   *
   * Construcción del filtro `where`:
   * - Siempre filtra isActive: true.
   * - `inStock: true` agrega `stock > 0`.
   * - `categorySlug` soporta jerarquía de dos niveles:
   *     Si el slug es una categoría PADRE, incluye automáticamente los IDs
   *     de todas sus subcategorías hijas (una consulta extra por llamada).
   *     Si es una subcategoría (leaf), filtra solo por su ID.
   * - `search` busca en nombre, descripción y SKU (case-insensitive).
   * - `minPrice` / `maxPrice` filtran por rango de precio en centavos.
   */
  async findAll(filters: ProductFilters): Promise<PaginatedProducts> {
    const page  = filters.page  ?? 1
    const limit = filters.limit ?? 12
    const skip  = (page - 1) * limit

    // Resolver IDs de categoría con expansión padre → hijos
    let categoryIdFilter: { in: string[] } | undefined
    if (filters.categorySlug) {
      const cat = await prisma.category.findUnique({
        where: { slug: filters.categorySlug },
        include: { children: { select: { id: true } } },
      })
      if (cat) {
        categoryIdFilter = { in: [cat.id, ...cat.children.map((c) => c.id)] }
      }
    }

    const where = {
      isActive: true,
      ...(filters.inStock  && { stock: { gt: 0 } }),
      ...(categoryIdFilter && { categoryId: categoryIdFilter }),
      ...(filters.search && {
        OR: [
          { name:        { contains: filters.search, mode: 'insensitive' as const } },
          { description: { contains: filters.search, mode: 'insensitive' as const } },
          { sku:         { contains: filters.search, mode: 'insensitive' as const } },
        ],
      }),
      ...(filters.minPrice !== undefined && { price: { gte: filters.minPrice } }),
      ...(filters.maxPrice !== undefined && { price: { lte: filters.maxPrice } }),
    }

    // Promise.all — count + findMany en paralelo
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { compatible: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ])

    return { items: items.map(toDomain), total, page, limit }
  }

  /**
   * Retorna productos con stock menor o igual al umbral.
   * Usado en el dashboard admin para alertas de stock bajo.
   */
  async findLowStock(threshold: number): Promise<Product[]> {
    const items = await prisma.product.findMany({
      where: { stock: { lte: threshold }, isActive: true },
      include: { compatible: true },
      orderBy: { stock: 'asc' }, // primero los más críticos
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
        stock: data.stock,
        sku: data.sku,
        images: data.images,
        isActive: data.isActive,
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
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
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

  /** Elimina un producto de la base de datos */
  async delete(id: string): Promise<void> {
    await prisma.product.delete({ where: { id } })
  }
}
