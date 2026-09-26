import { describe, it, expect } from 'vitest'
import {
  comparePriceIndexes,
  computePriceIndex,
  priceIndexCutoffDate,
  quantile,
  PRICE_INDEX_METHODOLOGY_VERSION,
  type PriceIndexProductInput,
} from '@/domain/entities/PriceIndex'

const product = (price: number, slug = 'bujias', name = 'Bujías', parentName: string | null = 'Repuestos'): PriceIndexProductInput => ({
  price, categorySlug: slug, categoryName: name, parentName,
})

describe('quantile', () => {
  it('interpola linealmente (método de hoja de cálculo)', () => {
    expect(quantile([10, 20, 30, 40], 0.5)).toBe(25)
    expect(quantile([10, 20, 30, 40], 0.25)).toBe(17.5)
    expect(quantile([7], 0.75)).toBe(7)
  })
  it('lista vacía es un error de programación', () => {
    expect(() => quantile([], 0.5)).toThrow()
  })
})

describe('computePriceIndex', () => {
  const bujias = [5000, 1000, 3000, 2000, 4000].map((p) => product(p))
  const aceites = [9000, 8000, 7000, 6000, 10000, 11000].map((p) => product(p, 'aceites', 'Aceites', null))
  const pocos = [100, 200].map((p) => product(p, 'espejos', 'Espejos', 'Accesorios'))

  it('calcula mediana, cuartiles y extremos por categoría', () => {
    const data = computePriceIndex([...bujias])
    expect(data.categories[0]).toEqual({
      slug: 'bujias', name: 'Bujías', parentName: 'Repuestos', count: 5,
      median: 3000, p25: 2000, p75: 4000, min: 1000, max: 5000,
    })
  })
  it('deja fuera las categorías con muestra insuficiente y las lista aparte', () => {
    const data = computePriceIndex([...bujias, ...pocos])
    expect(data.categories.map((c) => c.slug)).toEqual(['bujias'])
    expect(data.insufficient).toEqual([{ slug: 'espejos', name: 'Espejos', count: 2 }])
  })
  it('ordena de mayor a menor mediana y redondea a centavos enteros', () => {
    const data = computePriceIndex([...bujias, ...aceites])
    expect(data.categories.map((c) => c.slug)).toEqual(['aceites', 'bujias'])
    expect(data.categories[0]!.median).toBe(8500)
    expect(Number.isInteger(data.categories[0]!.p25)).toBe(true)
  })
  it('ignora precios en cero o inválidos y cuenta solo los válidos', () => {
    const data = computePriceIndex([...bujias, product(0), product(Number.NaN)])
    expect(data.productCount).toBe(5)
    expect(data.categories[0]!.count).toBe(5)
  })
  it('declara la metodología con la que se calculó', () => {
    const data = computePriceIndex([])
    expect(data).toMatchObject({ methodologyVersion: PRICE_INDEX_METHODOLOGY_VERSION, minSample: 5, productCount: 0, categories: [], insufficient: [] })
  })
})

describe('comparePriceIndexes', () => {
  const base = computePriceIndex([1000, 2000, 3000, 4000, 5000].map((p) => product(p)))
  const later = computePriceIndex([1000, 2000, 3300, 4000, 5000].map((p) => product(p)))

  it('variación de la mediana en % con un decimal', () => {
    expect(comparePriceIndexes(later, base).get('bujias')).toBe(10)
  })
  it('sin corte anterior o con otra metodología no compara', () => {
    expect(comparePriceIndexes(later, null).size).toBe(0)
    expect(comparePriceIndexes(later, { ...base, methodologyVersion: 0 }).size).toBe(0)
  })
  it('solo compara categorías presentes en los dos cortes', () => {
    const other = computePriceIndex([1, 2, 3, 4, 5].map((p) => product(p, 'aceites', 'Aceites', null)))
    expect(comparePriceIndexes(other, base).size).toBe(0)
  })
})

describe('priceIndexCutoffDate', () => {
  it('usa el día de Colombia (UTC-5)', () => {
    expect(priceIndexCutoffDate(new Date('2026-09-27T03:00:00Z'))).toBe('2026-09-26')
    expect(priceIndexCutoffDate(new Date('2026-09-27T06:00:00Z'))).toBe('2026-09-27')
  })
})
