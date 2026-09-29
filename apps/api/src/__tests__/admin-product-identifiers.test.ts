import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@h2r/database', () => ({
  prisma: { client: {} },
  PrismaClient: vi.fn(),
}))

import { NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { AdminProductIdentifiersController } from '../admin/admin-product-identifiers.controller'

// ── Marca, MPN, tipo y garantía (Fase 7, H-18) ───────────────────────────────

describe('AdminProductIdentifiersController', () => {
  const prisma = { client: { product: { findUnique: vi.fn(), update: vi.fn() } } }
  const indexNow = { notifyProduct: vi.fn() }
  let controller: AdminProductIdentifiersController

  beforeEach(() => {
    vi.resetAllMocks()
    controller = new AdminProductIdentifiersController(prisma as never, indexNow as never)
  })

  it('set: normaliza, guarda y avisa a IndexNow', async () => {
    prisma.client.product.findUnique.mockResolvedValue({ id: 'p1' })
    prisma.client.product.update.mockResolvedValue({ slug: 'bateria-magna' })
    await controller.set('p1', { partBrand: ' Magna ', mpn: '', partType: 'HOMOLOGADO', warrantyMonths: 6 })
    expect(prisma.client.product.update.mock.calls[0]![0].data).toEqual({
      partBrand: 'Magna', mpn: null, partType: 'HOMOLOGADO', warrantyMonths: 6,
    })
    expect(indexNow.notifyProduct).toHaveBeenCalledWith('bateria-magna')
  })

  it('set: 422 con una marca no válida, 404 si el producto no existe', async () => {
    await expect(controller.set('p1', { partBrand: 'Genérico' })).rejects.toBeInstanceOf(UnprocessableEntityException)
    prisma.client.product.findUnique.mockResolvedValue(null)
    await expect(controller.set('x', { partBrand: 'Magna' })).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.client.product.update).not.toHaveBeenCalled()
  })

  it('import: actualiza solo las columnas presentes y reporta SKUs inexistentes', async () => {
    prisma.client.product.findUnique.mockImplementation(async ({ where }: { where: { sku: string } }) =>
      where.sku === 'A-1' ? { id: 'p1' } : null,
    )
    prisma.client.product.update.mockResolvedValue({ slug: 'a-1' })
    const csv = 'sku,marca,mpn,tipo,garantia_meses\nA-1,NGK,,-,\nZ-9,Bosch,,,\n'
    const report = await controller.import({ buffer: Buffer.from(csv) })
    expect(report.updated).toBe(1)
    expect(report.errors).toEqual([{ line: 3, message: 'No existe ningún producto con SKU "Z-9"' }])
    expect(prisma.client.product.update.mock.calls[0]![0].data).toEqual({ partBrand: 'NGK', partType: null })
  })
})
