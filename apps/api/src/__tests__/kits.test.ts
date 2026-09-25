import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@h2r/database', () => ({
  prisma: { client: {} },
  PrismaClient: vi.fn(),
}))

import { HttpException, NotFoundException } from '@nestjs/common'
import type { IKitRepository } from '@h2r/domain'
import { AdminKitsController } from '../admin/admin-kits.controller'

const product = (id: string, extra: Record<string, unknown> = {}) => ({
  id, name: `Producto ${id}`, sku: `SKU-${id}`, price: 1000000, stock: 5, isActive: true, deletedAt: null, images: [`img-${id}`], ...extra,
})

const validDto = {
  name: 'Kit NKD 125', slug: 'kit-nkd-125', discountCents: 0, isActive: true,
  items: [{ productId: 'A', quantity: 1 }, { productId: 'B', quantity: 2 }],
}

describe('AdminKitsController', () => {
  const kitRepo = { save: vi.fn(), findById: vi.fn(), slugExists: vi.fn(), findProducts: vi.fn(), softDelete: vi.fn() }
  const prisma = { client: { kit: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() } } }
  let controller: AdminKitsController

  beforeEach(() => {
    vi.resetAllMocks()
    controller = new AdminKitsController(kitRepo as unknown as IKitRepository, prisma as never)
  })

  it('list: calcula precio y disponibilidad en vivo, no confía en nada guardado', async () => {
    prisma.client.kit.findMany.mockResolvedValue([
      {
        id: 'k1', name: 'Kit NKD 125', slug: 'kit-nkd-125', discountCents: 20000, isActive: true, modelId: 'm1',
        model: { name: 'NKD 125', brand: { name: 'AKT' } },
        items: [
          { quantity: 1, product: product('A', { price: 100000, stock: 10 }) },
          { quantity: 2, product: product('B', { price: 50000, stock: 3 }) },
        ],
      },
    ])
    const [summary] = await controller.list()
    // A(100.000)x1 + B(50.000)x2 = 200.000 - 20.000 descuento = 180.000
    expect(summary).toMatchObject({
      itemsTotal: 200000, discountCents: 20000, price: 180000,
      // availableUnits = min(floor(10/1), floor(3/2)) = min(10, 1) = 1
      availableUnits: 1,
      modelLabel: 'AKT NKD 125',
    })
  })

  it('list: 0 unidades disponibles si un ítem está inactivo', async () => {
    prisma.client.kit.findMany.mockResolvedValue([
      {
        id: 'k1', name: 'K', slug: 's', discountCents: 0, isActive: true, modelId: null, model: null,
        items: [
          { quantity: 1, product: product('A') },
          { quantity: 1, product: product('B', { isActive: false }) },
        ],
      },
    ])
    const [summary] = await controller.list()
    expect(summary.availableUnits).toBe(0)
  })

  it('getOne: 404 si no existe o está borrado', async () => {
    prisma.client.kit.findUnique.mockResolvedValue(null)
    await expect(controller.getOne('x')).rejects.toBeInstanceOf(NotFoundException)
    prisma.client.kit.findUnique.mockResolvedValue({ id: 'k1', deletedAt: new Date(), items: [] })
    await expect(controller.getOne('k1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('create: guarda a través de SetKit y devuelve el kit', async () => {
    kitRepo.slugExists.mockResolvedValue(false)
    kitRepo.findProducts.mockResolvedValue([{ id: 'A', price: 100000 }, { id: 'B', price: 50000 }])
    kitRepo.save.mockImplementation(async (input) => ({ ...input, id: 'k1' }))
    const out = await controller.create(validDto)
    expect(out).toMatchObject({ id: 'k1', name: 'Kit NKD 125' })
    expect(kitRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: undefined, slug: 'kit-nkd-125' }))
  })

  it('create: un error de dominio se traduce a HTTP 422', async () => {
    kitRepo.slugExists.mockResolvedValue(false)
    kitRepo.findProducts.mockResolvedValue([{ id: 'A', price: 100000 }]) // falta B
    await expect(controller.create(validDto)).rejects.toMatchObject({ constructor: HttpException, status: 422 })
  })

  it('update: pasa el id al caso de uso', async () => {
    kitRepo.slugExists.mockResolvedValue(false)
    kitRepo.findProducts.mockResolvedValue([{ id: 'A', price: 100000 }, { id: 'B', price: 50000 }])
    kitRepo.save.mockImplementation(async (input) => ({ ...input }))
    await controller.update('k1', validDto)
    expect(kitRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'k1' }))
  })

  it('remove: soft delete', async () => {
    const out = await controller.remove('k1')
    expect(kitRepo.softDelete).toHaveBeenCalledWith('k1')
    expect(out).toEqual({ success: true })
  })
})
