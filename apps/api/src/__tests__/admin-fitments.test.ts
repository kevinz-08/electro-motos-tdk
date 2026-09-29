import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@h2r/database', () => ({
  prisma: { client: {} },
  PrismaClient: vi.fn(),
}))

import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { AppError } from '@h2r/domain'
import { AdminFitmentsController } from '../admin/admin-fitments.controller'
import { SaveFitmentDto } from '../admin/dto/save-fitment.dto'

// ── Pantalla de compatibilidades del panel (H-37) ────────────────────────────

describe('AdminFitmentsController', () => {
  const motorcycleRepo = { findAllModels: vi.fn() }
  const fitmentRepo = { upsert: vi.fn() }
  const oemRepo = {}
  const productRepo = { findById: vi.fn() }
  const prisma = {
    client: {
      motorcycleModel: { findMany: vi.fn() },
      fitment: { groupBy: vi.fn() },
      oemReference: { delete: vi.fn() },
    },
  }
  let controller: AdminFitmentsController

  beforeEach(() => {
    vi.resetAllMocks()
    controller = new AdminFitmentsController(
      motorcycleRepo as never, fitmentRepo as never, oemRepo as never, productRepo as never, prisma as never,
    )
  })

  it('modelsSummary: separa verificadas y pendientes por modelo, y pone 0 a los modelos sin ninguna', async () => {
    prisma.client.motorcycleModel.findMany.mockResolvedValue([
      { id: 'm1', name: 'NKD 125', slug: 'nkd-125', brand: { name: 'AKT', slug: 'akt' }, isActive: true, aliases: [] },
      { id: 'm2', name: 'FZ', slug: 'fz', brand: { name: 'Yamaha', slug: 'yamaha' }, isActive: true, aliases: [] },
    ])
    prisma.client.fitment.groupBy.mockResolvedValue([
      { modelId: 'm1', verified: true, _count: { _all: 4 } },
      { modelId: 'm1', verified: false, _count: { _all: 2 } },
    ])
    const rows = await controller.modelsSummary()
    expect(rows[0]).toMatchObject({ id: 'm1', brandName: 'AKT', verified: 4, pending: 2 })
    expect(rows[1]).toMatchObject({ id: 'm2', verified: 0, pending: 0 })
  })

  it('save: guarda con el email del admin como verificador', async () => {
    productRepo.findById.mockResolvedValue({ id: 'p1' })
    motorcycleRepo.findAllModels.mockResolvedValue([{ id: 'm1' }])
    fitmentRepo.upsert.mockImplementation(async (f: unknown) => ({ fitment: f, created: true }))
    const out = await controller.save(
      { productId: 'p1', modelId: 'm1', position: 'AMBAS', source: 'Manual', verified: true },
      { email: 'admin@h2r.co' },
    )
    expect(out.created).toBe(true)
    expect(fitmentRepo.upsert.mock.calls[0]![0]).toMatchObject({ verifiedBy: 'admin@h2r.co', verified: true })
  })

  it('save: propaga el AppError del dominio (lo traduce el HttpExceptionFilter)', async () => {
    await expect(
      controller.save({ productId: 'p1', modelId: 'm1', position: 'AMBAS', source: ' ', verified: true }, undefined),
    ).rejects.toBeInstanceOf(AppError)
    expect(fitmentRepo.upsert).not.toHaveBeenCalled()
  })

  it('removeOem: borra la referencia', async () => {
    prisma.client.oemReference.delete.mockResolvedValue({})
    expect(await controller.removeOem('o1')).toEqual({ success: true })
    expect(prisma.client.oemReference.delete).toHaveBeenCalledWith({ where: { id: 'o1' } })
  })
})

describe('SaveFitmentDto', () => {
  const valid = { productId: 'p1', modelId: 'm1', position: 'TRASERA', source: 'Catálogo 2026', verified: false }

  it('acepta un cuerpo válido', async () => {
    expect(await validate(plainToInstance(SaveFitmentDto, valid))).toHaveLength(0)
  })
  it('rechaza posición desconocida, años fuera de rango y verified no booleano', async () => {
    const errors = await validate(
      plainToInstance(SaveFitmentDto, { ...valid, position: 'LATERAL', yearFrom: 1800, verified: 'si' }),
    )
    expect(errors.map((e) => e.property).sort()).toEqual(['position', 'verified', 'yearFrom'])
  })
})
