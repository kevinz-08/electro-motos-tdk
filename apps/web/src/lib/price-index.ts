/**
 * Lectura pública del Índice de Precios (docs/seo/, Fase 5 — ítem 4).
 *
 * Solo cortes PUBLICADOS (los revisó una persona). La página pinta el corte
 * tal como se guardó: nunca recalcula con los precios de hoy, para que una
 * cifra citada siga siendo verificable.
 */
import { prisma } from '@/infrastructure/database/prisma-client'
import type { PriceIndexData } from '@h2r/domain'

export interface PublicPriceIndex {
  /** YYYY-MM-DD */
  cutoffDate: string
  /** ISO */
  publishedAt: string
  data: PriceIndexData
  /** Corte publicado inmediatamente anterior, para la variación. */
  previous: { cutoffDate: string; data: PriceIndexData } | null
}

export const PRICE_INDEX_PATH = '/indice-precios-repuestos-moto'

export async function findPublishedPriceIndex(): Promise<PublicPriceIndex | null> {
  const [latest, previous] = await prisma.priceIndexSnapshot.findMany({
    where: { isPublished: true },
    orderBy: { cutoffDate: 'desc' },
    take: 2,
  })
  if (!latest) return null
  return {
    cutoffDate: latest.cutoffDate.toISOString().slice(0, 10),
    publishedAt: (latest.publishedAt ?? latest.createdAt).toISOString(),
    data: latest.data as unknown as PriceIndexData,
    previous: previous
      ? { cutoffDate: previous.cutoffDate.toISOString().slice(0, 10), data: previous.data as unknown as PriceIndexData }
      : null,
  }
}
