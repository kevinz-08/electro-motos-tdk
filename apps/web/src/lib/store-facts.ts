/**
 * Hechos verificables de la tienda (docs/seo/, Fase 6 — GEO).
 *
 * Una sola fuente, calculada desde la base de datos, para todo lo que el sitio
 * afirma sobre sí mismo a buscadores y motores generativos: `/llms.txt` y
 * `/por-que-comprar-en-h2r` leen de aquí, así nunca pueden contradecirse ni
 * quedarse con una cifra vieja escrita a mano. Lo que no se puede calcular (la
 * garantía, el plazo de cambios) viene de decisiones del negocio ya confirmadas
 * en docs/seo/HUMAN_TASKS.md (H-15, H-17).
 */
import { prisma } from '@/infrastructure/database/prisma-client'
import { LOCAL_DELIVERY_DAYS, parseCroSettings } from '@h2r/domain'
import { ORGANIZATION } from '@/lib/structured-data'

/** Confirmados por el negocio: H-17 (garantía) y H-15 (cambios). */
export const WARRANTY_MONTHS = 6
export const RETURNS_DAYS = 5

export interface StoreFacts {
  activeProducts: number
  inStockProducts: number
  categoriesWithProducts: number
  /** Modelos con hub publicado (al menos un repuesto con compatibilidad verificada). */
  modelsWithHub: number
  brandsWithHub: number
  verifiedFitments: number
  reviews: { count: number; average: number | null }
  /** `minDays`/`maxDays`: resto de Colombia; `local`: Bucaramanga y área metropolitana (H-60). */
  shipping: { minDays: number; maxDays: number; local: { min: number; max: number }; cutoffHour: number; freeShippingFromCents: number }
  cashOnDelivery: boolean
  publishedGuides: number
  store: typeof ORGANIZATION
}

export async function findStoreFacts(): Promise<StoreFacts> {
  const [active, inStock, categoryGroups, hubModels, verifiedFitments, reviews, settings, codSetting, guides] = await Promise.all([
    prisma.product.count({ where: { isActive: true, deletedAt: null } }),
    prisma.product.count({ where: { isActive: true, deletedAt: null, stock: { gt: 0 } } }),
    prisma.product.groupBy({ by: ['categoryId'], where: { isActive: true, deletedAt: null } }),
    prisma.motorcycleModel.findMany({
      where: { isActive: true, fitments: { some: { verified: true, product: { isActive: true, deletedAt: null } } } },
      select: { brandId: true },
    }),
    prisma.fitment.count({ where: { verified: true, product: { isActive: true, deletedAt: null } } }),
    prisma.productReview
      .aggregate({ where: { status: 'APPROVED' }, _count: { _all: true }, _avg: { rating: true } })
      .catch(() => ({ _count: { _all: 0 }, _avg: { rating: null } })),
    prisma.settings.findMany(),
    prisma.settings.findUnique({ where: { key: 'COD_ENABLED' } }),
    prisma.maintenanceGuide
      .count({ where: { items: { some: {} }, reviewer: { isActive: true }, model: { isActive: true } } })
      .catch(() => 0),
  ])
  const cro = parseCroSettings(settings)

  return {
    activeProducts: active,
    inStockProducts: inStock,
    categoriesWithProducts: categoryGroups.length,
    modelsWithHub: hubModels.length,
    brandsWithHub: new Set(hubModels.map((m) => m.brandId)).size,
    verifiedFitments,
    reviews: {
      count: reviews._count._all,
      average: reviews._avg.rating !== null ? Math.round(reviews._avg.rating * 10) / 10 : null,
    },
    shipping: {
      minDays: cro.shippingEtaMinDays,
      maxDays: cro.shippingEtaMaxDays,
      local: { min: LOCAL_DELIVERY_DAYS.min, max: LOCAL_DELIVERY_DAYS.max },
      cutoffHour: cro.shippingCutoffHour,
      freeShippingFromCents: cro.freeShippingThreshold,
    },
    cashOnDelivery: codSetting ? codSetting.value === 'true' : true,
    publishedGuides: guides,
    store: ORGANIZATION,
  }
}
