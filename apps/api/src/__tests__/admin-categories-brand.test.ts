import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@h2r/database', () => ({
  prisma: { client: {} },
  PrismaClient: vi.fn(),
}))

import { ConflictException, NotFoundException } from '@nestjs/common'
import { AdminCategoriesController } from '../admin/admin-categories.controller'

// ── "Es una marca" (Índice de Precios, H-55 opción C) ────────────────────────

describe('AdminCategoriesController — subcategorías de marca', () => {
  const prisma = {
    client: {
      category: { findMany: vi.fn(), findUnique: vi.fn() },
      settings: { findUnique: vi.fn(), upsert: vi.fn() },
    },
  }
  let controller: AdminCategoriesController

  beforeEach(() => {
    vi.resetAllMocks()
    controller = new AdminCategoriesController(prisma as never)
  })

  it('findAll: marca isBrand según el ajuste (o la lista por defecto si no existe)', async () => {
    prisma.client.category.findMany.mockResolvedValue([{ slug: 'sky' }, { slug: 'cdi' }])
    prisma.client.settings.findUnique.mockResolvedValue(null)
    expect(await controller.findAll()).toEqual([
      expect.objectContaining({ slug: 'sky', isBrand: true }),
      expect.objectContaining({ slug: 'cdi', isBrand: false }),
    ])
  })

  it('setBrand: agrega y quita el slug del ajuste, sin duplicados y ordenado', async () => {
    prisma.client.category.findUnique.mockResolvedValue({ id: 'c1', slug: 'motul', parentId: 'p1' })
    prisma.client.settings.findUnique.mockResolvedValue({ value: '["sky","motul"]' })
    await controller.setBrand('c1', { isBrand: true })
    expect(prisma.client.settings.upsert.mock.calls[0]![0]).toMatchObject({ update: { value: '["motul","sky"]' } })

    await controller.setBrand('c1', { isBrand: false })
    expect(prisma.client.settings.upsert.mock.calls[1]![0]).toMatchObject({ update: { value: '["sky"]' } })
  })

  it('setBrand: una categoría raíz no puede ser marca; 404 si no existe', async () => {
    prisma.client.category.findUnique.mockResolvedValueOnce({ id: 'r1', slug: 'aceites', parentId: null })
    await expect(controller.setBrand('r1', { isBrand: true })).rejects.toBeInstanceOf(ConflictException)
    prisma.client.category.findUnique.mockResolvedValueOnce(null)
    await expect(controller.setBrand('x', { isBrand: true })).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.client.settings.upsert).not.toHaveBeenCalled()
  })
})
