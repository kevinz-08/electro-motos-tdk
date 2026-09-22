import { Injectable } from '@nestjs/common'
import type {
  Fitment,
  FitmentWithModel,
  IFitmentRepository,
  IMotorcycleRepository,
  IOemReferenceRepository,
  ModelHub,
  MotorcycleBrand,
  MotorcycleModel,
  MotorcycleModelWithBrand,
  OemReference,
} from '@h2r/domain'
import { PrismaService } from '../database/prisma.service'

/**
 * Implementación de los repositorios de compatibilidad en la API (docs/seo/, Fase 2).
 *
 * La API es el lado de **escritura**: la importación masiva desde CSV y la
 * gestión de marcas y modelos desde el panel. Las lecturas públicas del catálogo
 * las hace `apps/web` directamente contra Prisma (ver AGENTS.md → Data Flow), lo
 * que explica que haya dos implementaciones del mismo contrato.
 *
 * Igual que en la web: todo lo público filtra `verified: true`, y los conteos
 * solo miran productos vendibles (activos y no borrados).
 */

const PUBLISHABLE_PRODUCT = { isActive: true, deletedAt: null } as const

type PrismaBrand = { id: string; name: string; slug: string; order: number; isActive: boolean }

type PrismaModel = {
  id: string; brandId: string; name: string; slug: string
  cc: number | null; yearFrom: number | null; yearTo: number | null
  aliases: string[]; intro: string | null; isActive: boolean
}

const brandToDomain = (b: PrismaBrand): MotorcycleBrand => ({
  id: b.id, name: b.name, slug: b.slug, order: b.order, isActive: b.isActive,
})

const modelToDomain = (m: PrismaModel): MotorcycleModel => ({
  id: m.id, brandId: m.brandId, name: m.name, slug: m.slug,
  cc: m.cc, yearFrom: m.yearFrom, yearTo: m.yearTo,
  aliases: m.aliases, intro: m.intro, isActive: m.isActive,
})

const withBrand = (m: PrismaModel & { brand: PrismaBrand }): MotorcycleModelWithBrand => ({
  ...modelToDomain(m),
  brand: brandToDomain(m.brand),
})

type PrismaFitment = {
  id: string; productId: string; modelId: string
  position: 'DELANTERA' | 'TRASERA' | 'AMBAS'
  yearFrom: number | null; yearTo: number | null
  notes: string | null; source: string
  verified: boolean; verifiedAt: Date | null; verifiedBy: string | null
}

const fitmentToDomain = (f: PrismaFitment): Fitment => ({
  id: f.id, productId: f.productId, modelId: f.modelId, position: f.position,
  yearFrom: f.yearFrom, yearTo: f.yearTo, notes: f.notes, source: f.source,
  verified: f.verified, verifiedAt: f.verifiedAt, verifiedBy: f.verifiedBy,
})

@Injectable()
export class PrismaMotorcycleRepository implements IMotorcycleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBrands(): Promise<MotorcycleBrand[]> {
    const brands = await this.prisma.client.motorcycleBrand.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    })
    return brands.map(brandToDomain)
  }

  async findModelsByBrand(brandSlug: string): Promise<MotorcycleModel[]> {
    const models = await this.prisma.client.motorcycleModel.findMany({
      where: { isActive: true, brand: { slug: brandSlug, isActive: true } },
      orderBy: { name: 'asc' },
    })
    return models.map(modelToDomain)
  }

  async findAllModels(): Promise<MotorcycleModelWithBrand[]> {
    const models = await this.prisma.client.motorcycleModel.findMany({
      where: { isActive: true, brand: { isActive: true } },
      include: { brand: true },
      orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
    })
    return models.map(withBrand)
  }

  async findModel(brandSlug: string, modelSlug: string): Promise<MotorcycleModelWithBrand | null> {
    const model = await this.prisma.client.motorcycleModel.findFirst({
      where: { slug: modelSlug, isActive: true, brand: { slug: brandSlug, isActive: true } },
      include: { brand: true },
    })
    return model ? withBrand(model) : null
  }

  async getModelHub(brandSlug: string, modelSlug: string): Promise<ModelHub | null> {
    const model = await this.findModel(brandSlug, modelSlug)
    if (!model) return null

    const rows = await this.prisma.client.product.findMany({
      where: { ...PUBLISHABLE_PRODUCT, fitments: { some: { modelId: model.id, verified: true } } },
      select: { id: true, category: { select: { id: true, name: true, slug: true } } },
    })

    const byCategory = new Map<string, { name: string; slug: string; count: number }>()
    for (const row of rows) {
      if (!row.category) continue
      const current = byCategory.get(row.category.id)
      if (current) current.count++
      else byCategory.set(row.category.id, { name: row.category.name, slug: row.category.slug, count: 1 })
    }

    const categories = [...byCategory.entries()]
      .map(([categoryId, c]) => ({
        categoryId,
        categoryName: c.name,
        categorySlug: c.slug,
        productCount: c.count,
      }))
      .sort((a, b) => b.productCount - a.productCount || a.categoryName.localeCompare(b.categoryName))

    return { model, categories, totalProducts: rows.length }
  }

  async findModelsWithVerifiedFitments(): Promise<MotorcycleModelWithBrand[]> {
    const models = await this.prisma.client.motorcycleModel.findMany({
      where: {
        isActive: true,
        brand: { isActive: true },
        fitments: { some: { verified: true, product: PUBLISHABLE_PRODUCT } },
      },
      include: { brand: true },
      orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
    })
    return models.map(withBrand)
  }
}

@Injectable()
export class PrismaFitmentRepository implements IFitmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findVerifiedByProduct(productId: string): Promise<FitmentWithModel[]> {
    const fitments = await this.prisma.client.fitment.findMany({
      where: { productId, verified: true, model: { isActive: true, brand: { isActive: true } } },
      include: { model: { include: { brand: true } } },
      orderBy: [{ model: { brand: { name: 'asc' } } }, { model: { name: 'asc' } }],
    })
    return fitments.map((f) => ({ ...fitmentToDomain(f), model: withBrand(f.model) }))
  }

  async findAllByProductUnverified(productId: string): Promise<FitmentWithModel[]> {
    const fitments = await this.prisma.client.fitment.findMany({
      where: { productId },
      include: { model: { include: { brand: true } } },
      orderBy: [{ verified: 'desc' }, { model: { name: 'asc' } }],
    })
    return fitments.map((f) => ({ ...fitmentToDomain(f), model: withBrand(f.model) }))
  }

  async findProductIdsByModel(modelId: string, categoryId?: string): Promise<string[]> {
    const products = await this.prisma.client.product.findMany({
      where: {
        ...PUBLISHABLE_PRODUCT,
        ...(categoryId ? { categoryId } : {}),
        fitments: { some: { modelId, verified: true } },
      },
      select: { id: true },
      orderBy: [{ stock: 'desc' }, { soldCount: 'desc' }],
    })
    return products.map((p) => p.id)
  }

  async upsert(
    fitment: Omit<Fitment, 'id' | 'verifiedAt'> & { verifiedAt?: Date | null },
  ): Promise<{ fitment: Fitment; created: boolean }> {
    const existing = await this.prisma.client.fitment.findUnique({
      where: {
        productId_modelId_position: {
          productId: fitment.productId,
          modelId: fitment.modelId,
          position: fitment.position,
        },
      },
      select: { id: true },
    })

    const data = {
      yearFrom: fitment.yearFrom,
      yearTo: fitment.yearTo,
      notes: fitment.notes,
      source: fitment.source,
      verified: fitment.verified,
      verifiedAt: fitment.verifiedAt ?? null,
      verifiedBy: fitment.verifiedBy,
    }

    const saved = existing
      ? await this.prisma.client.fitment.update({ where: { id: existing.id }, data })
      : await this.prisma.client.fitment.create({
          data: {
            productId: fitment.productId,
            modelId: fitment.modelId,
            position: fitment.position,
            ...data,
          },
        })

    return { fitment: fitmentToDomain(saved), created: !existing }
  }

  async countVerified(): Promise<number> {
    return this.prisma.client.fitment.count({
      where: { verified: true, product: PUBLISHABLE_PRODUCT },
    })
  }
}

@Injectable()
export class PrismaOemReferenceRepository implements IOemReferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(productId: string): Promise<OemReference[]> {
    const refs = await this.prisma.client.oemReference.findMany({
      where: { productId },
      orderBy: { reference: 'asc' },
    })
    return refs.map((r) => ({
      id: r.id,
      productId: r.productId,
      reference: r.reference,
      normalized: r.normalized,
      manufacturer: r.manufacturer,
    }))
  }

  async findProductIdsByReference(normalized: string): Promise<string[]> {
    const refs = await this.prisma.client.oemReference.findMany({
      where: { normalized, product: PUBLISHABLE_PRODUCT },
      select: { productId: true },
    })
    return [...new Set(refs.map((r) => r.productId))]
  }

  async upsert(reference: Omit<OemReference, 'id'>): Promise<OemReference> {
    const saved = await this.prisma.client.oemReference.upsert({
      where: {
        productId_normalized: { productId: reference.productId, normalized: reference.normalized },
      },
      create: reference,
      update: { reference: reference.reference, manufacturer: reference.manufacturer },
    })

    return {
      id: saved.id,
      productId: saved.productId,
      reference: saved.reference,
      normalized: saved.normalized,
      manufacturer: saved.manufacturer,
    }
  }
}
