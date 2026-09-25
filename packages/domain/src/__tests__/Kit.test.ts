import { describe, it, expect, vi } from 'vitest'
import {
  MAX_KIT_ITEMS,
  MIN_KIT_ITEMS,
  computeKitAvailability,
  computeKitPrice,
  isKitItemCompatible,
  isKitVisible,
  validateKitPricing,
} from '@/domain/entities/Kit'
import { SetKit } from '@/domain/use-cases/kits/SetKit'
import type { IKitRepository } from '@/domain/repositories/IKitRepository'

describe('validateKitPricing / computeKitPrice', () => {
  it('sin descuento es válido y el precio es la suma', () => {
    expect(validateKitPricing(100_000, 0)).toBeNull()
    expect(computeKitPrice(100_000, 0)).toBe(100_000)
  })

  it('un descuento menor que la suma es válido', () => {
    expect(validateKitPricing(100_000, 20_000)).toBeNull()
    expect(computeKitPrice(100_000, 20_000)).toBe(80_000)
  })

  it('rechaza descuentos negativos, no enteros, o >= a la suma', () => {
    expect(validateKitPricing(100_000, -1)).not.toBeNull()
    expect(validateKitPricing(100_000, 50.5)).not.toBeNull()
    expect(validateKitPricing(100_000, 100_000)).not.toBeNull()
    expect(validateKitPricing(100_000, 150_000)).not.toBeNull()
  })
})

describe('computeKitAvailability', () => {
  const item = (over: Partial<Parameters<typeof computeKitAvailability>[0][number]> = {}) => ({
    quantity: 1, stock: 10, isActive: true, deletedAt: null, ...over,
  })

  it('sin ítems no hay disponibilidad', () => {
    expect(computeKitAvailability([])).toBe(0)
  })

  it('es el mínimo de floor(stock/quantity) entre los ítems', () => {
    expect(computeKitAvailability([item({ stock: 10, quantity: 2 }), item({ stock: 3, quantity: 1 })])).toBe(3)
  })

  it('0 si algún ítem está inactivo o borrado, sin importar el resto', () => {
    expect(computeKitAvailability([item(), item({ isActive: false })])).toBe(0)
    expect(computeKitAvailability([item(), item({ deletedAt: new Date() })])).toBe(0)
  })

  it('0 si el stock no alcanza para ni una unidad', () => {
    expect(computeKitAvailability([item({ stock: 1, quantity: 2 })])).toBe(0)
  })
})

describe('isKitVisible', () => {
  it('activo, no borrado y con disponibilidad', () => {
    expect(isKitVisible({ isActive: true, deletedAt: null }, 1)).toBe(true)
    expect(isKitVisible({ isActive: true, deletedAt: null }, 0)).toBe(false)
    expect(isKitVisible({ isActive: false, deletedAt: null }, 1)).toBe(false)
    expect(isKitVisible({ isActive: true, deletedAt: new Date() }, 1)).toBe(false)
  })
})

describe('isKitItemCompatible', () => {
  const moto = { brandSlug: 'akt', modelSlug: 'nkd-125', year: 2022 }
  const nkd = { brandSlug: 'akt', modelSlug: 'nkd-125', yearFrom: null, yearTo: null }
  const dr = { brandSlug: 'suzuki', modelSlug: 'dr150', yearFrom: null, yearTo: null }

  it('sin moto o sin fitments se considera compatible', () => {
    expect(isKitItemCompatible([dr], null)).toBe(true)
    expect(isKitItemCompatible([], moto)).toBe(true)
  })
  it('compara marca, modelo y año', () => {
    expect(isKitItemCompatible([dr, nkd], moto)).toBe(true)
    expect(isKitItemCompatible([dr], moto)).toBe(false)
  })
})

function makeRepo(opts: { prices?: Record<string, number>; slugTaken?: boolean } = {}) {
  const prices = opts.prices ?? { A: 100_000, B: 50_000, C: 30_000, D: 20_000, E: 10_000, F: 5_000, G: 5_000, H: 5_000, I: 5_000 }
  return {
    save: vi.fn().mockImplementation(async (input) => ({ id: input.id ?? 'new-kit', ...input })),
    findById: vi.fn(),
    slugExists: vi.fn().mockResolvedValue(opts.slugTaken ?? false),
    findProducts: vi.fn().mockImplementation(async (ids: string[]) =>
      ids.filter((id) => id in prices).map((id) => ({ id, price: prices[id]! })),
    ),
    softDelete: vi.fn(),
  } as unknown as IKitRepository
}

const baseInput = {
  name: 'Kit NKD 125', slug: 'kit-nkd-125', discountCents: 0, isActive: true,
  items: [{ productId: 'A', quantity: 1 }, { productId: 'B', quantity: 2 }],
}

describe('SetKit', () => {
  it('crea un kit con el descuento y la disponibilidad correctos', async () => {
    const repo = makeRepo()
    const r = await new SetKit(repo).execute(baseInput)
    expect(r.ok).toBe(true)
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Kit NKD 125',
      slug: 'kit-nkd-125',
      items: [{ productId: 'A', quantity: 1, order: 0 }, { productId: 'B', quantity: 2, order: 1 }],
    }))
  })

  it('rechaza nombre o slug vacíos', async () => {
    const repo = makeRepo()
    expect((await new SetKit(repo).execute({ ...baseInput, name: '  ' })).ok).toBe(false)
    expect((await new SetKit(repo).execute({ ...baseInput, slug: '' })).ok).toBe(false)
  })

  it(`rechaza menos de ${MIN_KIT_ITEMS} o más de ${MAX_KIT_ITEMS} ítems`, async () => {
    const repo = makeRepo()
    const one = { ...baseInput, items: [{ productId: 'A', quantity: 1 }] }
    expect((await new SetKit(repo).execute(one)).ok).toBe(false)
    const nine = { ...baseInput, items: 'ABCDEFGHI'.split('').map((id) => ({ productId: id, quantity: 1 })) }
    expect((await new SetKit(repo).execute(nine)).ok).toBe(false)
  })

  it('rechaza productos repetidos y cantidades inválidas', async () => {
    const repo = makeRepo()
    const dup = { ...baseInput, items: [{ productId: 'A', quantity: 1 }, { productId: 'A', quantity: 2 }] }
    expect((await new SetKit(repo).execute(dup)).ok).toBe(false)
    const zero = { ...baseInput, items: [{ productId: 'A', quantity: 0 }, { productId: 'B', quantity: 1 }] }
    expect((await new SetKit(repo).execute(zero)).ok).toBe(false)
    const frac = { ...baseInput, items: [{ productId: 'A', quantity: 1.5 }, { productId: 'B', quantity: 1 }] }
    expect((await new SetKit(repo).execute(frac)).ok).toBe(false)
  })

  it('rechaza un slug ya usado por otro kit', async () => {
    const repo = makeRepo({ slugTaken: true })
    const r = await new SetKit(repo).execute(baseInput)
    expect(r.ok).toBe(false)
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('rechaza un producto que no existe o está en la papelera', async () => {
    const repo = makeRepo({ prices: { A: 100_000 } })
    const r = await new SetKit(repo).execute(baseInput)
    expect(r.ok).toBe(false)
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('valida el descuento contra la suma REAL calculada server-side, no una que mande el cliente', async () => {
    // A(100.000) + B(50.000)x2 = 200.000. Un descuento de 199.999 es válido; 200.000 no.
    const repo = makeRepo()
    const ok1 = await new SetKit(repo).execute({ ...baseInput, discountCents: 199_999 })
    expect(ok1.ok).toBe(true)
    const repo2 = makeRepo()
    const bad = await new SetKit(repo2).execute({ ...baseInput, discountCents: 200_000 })
    expect(bad.ok).toBe(false)
    expect(repo2.save).not.toHaveBeenCalled()
  })

  it('un fallo de la base devuelve INTERNAL_ERROR sin lanzar', async () => {
    const repo = makeRepo()
    ;(repo.save as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('db'))
    const r = await new SetKit(repo).execute(baseInput)
    expect(!r.ok && r.error.code).toBe('INTERNAL_ERROR')
  })
})
