/**
 * Índice de Precios de Repuestos de Moto (docs/seo/, Fase 5 — ítem 4).
 *
 * TypeScript puro: recibe los productos del catálogo y devuelve el resultado
 * que se guarda, inmutable, en un corte (`PriceIndexSnapshot.data`). La página
 * pública solo pinta lo que hay en el corte; nunca recalcula con datos de hoy.
 *
 * Metodología v1 (si cambia, se sube la versión y no se comparan cortes de
 * versiones distintas):
 *   - Entran los productos activos, sin borrar y con precio > 0.
 *   - Se agrupan por su categoría (la subcategoría en la que están cargados).
 *   - Por grupo: n, mediana, percentiles 25 y 75, mínimo y máximo. Los
 *     percentiles usan interpolación lineal entre posiciones (el método por
 *     defecto de la mayoría de hojas de cálculo).
 *   - Solo se publica un grupo con al menos `PRICE_INDEX_MIN_SAMPLE`
 *     referencias; los demás se listan como muestra insuficiente.
 *   - Todos los precios en centavos (enteros), redondeados.
 */

export const PRICE_INDEX_METHODOLOGY_VERSION = 1
export const PRICE_INDEX_MIN_SAMPLE = 5

export interface PriceIndexProductInput {
  price: number
  categorySlug: string
  categoryName: string
  /** Categoría padre, para agrupar la presentación. `null` si es de primer nivel. */
  parentName: string | null
}

export interface PriceIndexCategory {
  slug: string
  name: string
  parentName: string | null
  count: number
  median: number
  p25: number
  p75: number
  min: number
  max: number
}

export interface PriceIndexData {
  methodologyVersion: number
  minSample: number
  productCount: number
  /** Solo los grupos con muestra suficiente, de mayor a menor mediana. */
  categories: PriceIndexCategory[]
  /** Grupos que no llegan a la muestra mínima. */
  insufficient: Array<{ slug: string; name: string; count: number }>
}

/** Percentil con interpolación lineal sobre una lista YA ordenada (q entre 0 y 1). */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) throw new Error('quantile de una lista vacía')
  const pos = (sorted.length - 1) * q
  const lower = Math.floor(pos)
  const upper = Math.ceil(pos)
  const weight = pos - lower
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * weight
}

export function computePriceIndex(products: readonly PriceIndexProductInput[]): PriceIndexData {
  const valid = products.filter((p) => Number.isFinite(p.price) && p.price > 0)
  const groups = new Map<string, { name: string; parentName: string | null; prices: number[] }>()
  for (const p of valid) {
    const g = groups.get(p.categorySlug) ?? { name: p.categoryName, parentName: p.parentName, prices: [] }
    g.prices.push(p.price)
    groups.set(p.categorySlug, g)
  }

  const categories: PriceIndexCategory[] = []
  const insufficient: PriceIndexData['insufficient'] = []
  for (const [slug, g] of groups) {
    if (g.prices.length < PRICE_INDEX_MIN_SAMPLE) {
      insufficient.push({ slug, name: g.name, count: g.prices.length })
      continue
    }
    const sorted = [...g.prices].sort((a, b) => a - b)
    categories.push({
      slug,
      name: g.name,
      parentName: g.parentName,
      count: sorted.length,
      median: Math.round(quantile(sorted, 0.5)),
      p25: Math.round(quantile(sorted, 0.25)),
      p75: Math.round(quantile(sorted, 0.75)),
      min: sorted[0]!,
      max: sorted[sorted.length - 1]!,
    })
  }

  categories.sort((a, b) => b.median - a.median || a.name.localeCompare(b.name))
  insufficient.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  return {
    methodologyVersion: PRICE_INDEX_METHODOLOGY_VERSION,
    minSample: PRICE_INDEX_MIN_SAMPLE,
    productCount: valid.length,
    categories,
    insufficient,
  }
}

/**
 * Variación de la mediana por categoría contra el corte anterior, en % con un
 * decimal. Solo para categorías presentes en ambos y si los dos cortes usan la
 * misma metodología; si no, el mapa queda vacío (no se comparan peras con manzanas).
 */
export function comparePriceIndexes(current: PriceIndexData, previous: PriceIndexData | null): Map<string, number> {
  const changes = new Map<string, number>()
  if (!previous || previous.methodologyVersion !== current.methodologyVersion) return changes
  const before = new Map(previous.categories.map((c) => [c.slug, c.median]))
  for (const c of current.categories) {
    const prev = before.get(c.slug)
    if (prev) changes.set(c.slug, Math.round(((c.median - prev) / prev) * 1000) / 10)
  }
  return changes
}

/** Fecha de corte (YYYY-MM-DD) en Colombia para un instante dado. */
export function priceIndexCutoffDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
