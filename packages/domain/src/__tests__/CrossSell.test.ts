import { describe, it, expect, vi } from 'vitest'
import {
  CROSS_SELL_HEADINGS,
  MAX_CROSS_SELLS,
  isCrossSellCompatible,
  isCrossSellVisible,
  mergeCartCrossSells,
  pickCrossSellHeading,
} from '@/domain/entities/ProductCrossSell'
import { SetProductCrossSells } from '@/domain/use-cases/crossSell/SetProductCrossSells'
import type { AppendCrossSellOutcome, ICrossSellRepository } from '@/domain/repositories/ICrossSellRepository'

describe('pickCrossSellHeading', () => {
  it('hay 10 títulos distintos y ninguno afirma ventas', () => {
    expect(CROSS_SELL_HEADINGS).toHaveLength(10)
    expect(new Set(CROSS_SELL_HEADINGS).size).toBe(10)
    for (const h of CROSS_SELL_HEADINGS) expect(h).not.toMatch(/suele comprarse|más vendido|otros clientes/i)
  })

  it('es determinista: el mismo producto siempre recibe el mismo título', () => {
    expect(pickCrossSellHeading('prod-abc')).toBe(pickCrossSellHeading('prod-abc'))
  })

  it('varía entre productos y siempre devuelve un título válido', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const h = pickCrossSellHeading(`producto-${i}`)
      expect(CROSS_SELL_HEADINGS).toContain(h)
      seen.add(h)
    }
    expect(seen.size).toBeGreaterThan(5)
  })
})

describe('isCrossSellVisible', () => {
  it('solo activo, no borrado y con stock', () => {
    expect(isCrossSellVisible({ isActive: true, deletedAt: null, stock: 3 })).toBe(true)
    expect(isCrossSellVisible({ isActive: true, deletedAt: null, stock: 0 })).toBe(false)
    expect(isCrossSellVisible({ isActive: false, deletedAt: null, stock: 3 })).toBe(false)
    expect(isCrossSellVisible({ isActive: true, deletedAt: new Date(), stock: 3 })).toBe(false)
    expect(isCrossSellVisible({ isActive: true, stock: 1 })).toBe(true)
  })
})

describe('isCrossSellCompatible', () => {
  const moto = { brandSlug: 'akt', modelSlug: 'nkd-125', year: 2022 }
  const nkd = { brandSlug: 'akt', modelSlug: 'nkd-125', yearFrom: null, yearTo: null }
  const dr = { brandSlug: 'suzuki', modelSlug: 'dr150', yearFrom: null, yearTo: null }

  it('sin moto elegida se muestra', () => {
    expect(isCrossSellCompatible([dr], null)).toBe(true)
  })
  it('sin fitments verificados se muestra (no se afirma que no sirve)', () => {
    expect(isCrossSellCompatible([], moto)).toBe(true)
  })
  it('con fitments que incluyen la moto se muestra', () => {
    expect(isCrossSellCompatible([dr, nkd], moto)).toBe(true)
  })
  it('con fitments que NO incluyen la moto se oculta', () => {
    expect(isCrossSellCompatible([dr], moto)).toBe(false)
  })
  it('respeta el rango de años', () => {
    expect(isCrossSellCompatible([{ ...nkd, yearFrom: 2023, yearTo: null }], moto)).toBe(false)
    expect(isCrossSellCompatible([{ ...nkd, yearFrom: 2020, yearTo: 2022 }], moto)).toBe(true)
    expect(isCrossSellCompatible([{ ...nkd, yearFrom: 2023, yearTo: null }], { ...moto, year: null })).toBe(true)
  })
})

describe('mergeCartCrossSells', () => {
  const s = (id: string) => ({ id })
  it('quita lo que ya está en el carrito y no repite', () => {
    const out = mergeCartCrossSells(
      [
        { productId: 'a', suggestions: [s('x'), s('b'), s('y')] },
        { productId: 'b', suggestions: [s('y'), s('z')] },
      ],
      ['a', 'b'],
    )
    expect(out.map((p) => p.id)).toEqual(['x', 'y', 'z'])
  })
  it('corta en el máximo', () => {
    const many = Array.from({ length: 10 }, (_, i) => s(`p${i}`))
    expect(mergeCartCrossSells([{ productId: 'a', suggestions: many }], ['a'])).toHaveLength(MAX_CROSS_SELLS)
  })
  it('sin sugerencias devuelve vacío', () => {
    expect(mergeCartCrossSells([], ['a'])).toEqual([])
  })
})

function makeRepo(opts: { existing?: string[]; append?: Record<string, AppendCrossSellOutcome> } = {}) {
  const existing = opts.existing ?? ['A', 'B', 'C', 'D', 'E', 'F']
  return {
    findByProduct: vi.fn().mockResolvedValue([]),
    replaceForProduct: vi.fn().mockResolvedValue(undefined),
    appendIfRoom: vi.fn().mockImplementation(async (id: string) => opts.append?.[id] ?? 'added'),
    findExistingProductIds: vi.fn().mockImplementation(async (ids: string[]) => ids.filter((i) => existing.includes(i))),
  } as unknown as ICrossSellRepository
}

describe('SetProductCrossSells', () => {
  it('guarda la lista en orden, con motivo opcional', async () => {
    const repo = makeRepo()
    const r = await new SetProductCrossSells(repo).execute({
      productId: 'A',
      items: [{ relatedId: 'B', reason: '  Se cambia junto con las pastillas ' }, { relatedId: 'C', reason: '   ' }],
    })
    expect(r.ok).toBe(true)
    expect(repo.replaceForProduct).toHaveBeenCalledWith('A', [
      { relatedId: 'B', reason: 'Se cambia junto con las pastillas', order: 0 },
      { relatedId: 'C', reason: null, order: 1 },
    ])
    expect(repo.appendIfRoom).not.toHaveBeenCalled()
  })

  it('una lista vacía limpia las sugerencias', async () => {
    const repo = makeRepo()
    const r = await new SetProductCrossSells(repo).execute({ productId: 'A', items: [] })
    expect(r.ok).toBe(true)
    expect(repo.replaceForProduct).toHaveBeenCalledWith('A', [])
  })

  it('rechaza más de 4, repetidos y autovínculo', async () => {
    const repo = makeRepo()
    const uc = new SetProductCrossSells(repo)
    const five = ['B', 'C', 'D', 'E', 'F'].map((relatedId) => ({ relatedId }))
    expect((await uc.execute({ productId: 'A', items: five })).ok).toBe(false)
    expect((await uc.execute({ productId: 'A', items: [{ relatedId: 'B' }, { relatedId: 'B' }] })).ok).toBe(false)
    expect((await uc.execute({ productId: 'A', items: [{ relatedId: 'A' }] })).ok).toBe(false)
    expect(repo.replaceForProduct).not.toHaveBeenCalled()
  })

  it('rechaza un motivo de más de 120 caracteres', async () => {
    const repo = makeRepo()
    const r = await new SetProductCrossSells(repo).execute({
      productId: 'A', items: [{ relatedId: 'B', reason: 'x'.repeat(121) }],
    })
    expect(r.ok).toBe(false)
  })

  it('NOT_FOUND si el producto no existe; VALIDATION_ERROR si un sugerido no existe', async () => {
    const uc = new SetProductCrossSells(makeRepo({ existing: ['B'] }))
    const a = await uc.execute({ productId: 'A', items: [{ relatedId: 'B' }] })
    expect(!a.ok && a.error.code).toBe('NOT_FOUND')
    const b = await new SetProductCrossSells(makeRepo({ existing: ['A'] })).execute({
      productId: 'A', items: [{ relatedId: 'B' }],
    })
    expect(!b.ok && b.error.code).toBe('VALIDATION_ERROR')
  })

  it('sentido inverso: agrega al final de la lista ajena y reporta cada caso', async () => {
    const repo = makeRepo({ append: { B: 'added', C: 'exists', D: 'full' } })
    const r = await new SetProductCrossSells(repo).execute({
      productId: 'A',
      items: [
        { relatedId: 'B', reciprocal: true },
        { relatedId: 'C', reciprocal: true },
        { relatedId: 'D', reciprocal: true },
        { relatedId: 'E' },
      ],
    })
    expect(r.ok && r.value.reciprocal).toEqual({ added: ['B'], alreadyLinked: ['C'], full: ['D'] })
    expect(repo.appendIfRoom).toHaveBeenCalledTimes(3)
    expect(repo.appendIfRoom).toHaveBeenCalledWith('B', 'A', MAX_CROSS_SELLS)
    expect(repo.replaceForProduct).toHaveBeenCalledTimes(1)
  })

  it('un fallo de la base devuelve INTERNAL_ERROR sin lanzar', async () => {
    const repo = makeRepo()
    ;(repo.replaceForProduct as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db'))
    const r = await new SetProductCrossSells(repo).execute({ productId: 'A', items: [{ relatedId: 'B' }] })
    expect(!r.ok && r.error.code).toBe('INTERNAL_ERROR')
  })
})
