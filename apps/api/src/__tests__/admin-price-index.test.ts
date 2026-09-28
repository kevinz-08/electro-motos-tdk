import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@h2r/database', () => ({
  prisma: { client: {} },
  PrismaClient: vi.fn(),
}))

import { NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import { AdminPriceIndexController } from '../admin/admin-price-index.controller'

// ── Índice de Precios (Fase 5, ítem 4) ───────────────────────────────────────

describe('AdminPriceIndexController', () => {
  const prisma = {
    client: {
      priceIndexSnapshot: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), update: vi.fn() },
      product: { findMany: vi.fn() },
      settings: { findUnique: vi.fn() },
    },
  }
  let controller: AdminPriceIndexController

  beforeEach(() => {
    vi.resetAllMocks()
    controller = new AdminPriceIndexController(prisma as never)
  })

  it('snapshot: calcula desde el catálogo y guarda el corte de hoy como borrador', async () => {
    prisma.client.priceIndexSnapshot.findUnique.mockResolvedValue(null)
    prisma.client.product.findMany.mockResolvedValue(
      [1000, 2000, 3000, 4000, 5000].map((price) => ({ price, category: { slug: 'bujias', name: 'Bujías', parent: { name: 'Repuestos' } } })),
    )
    prisma.client.priceIndexSnapshot.upsert.mockImplementation(async (args: unknown) => args)
    const args = (await controller.snapshot()) as unknown as { create: { productCount: number; data: { categories: { median: number }[] } } }
    expect(args.create.productCount).toBe(5)
    expect(args.create.data.categories[0]!.median).toBe(3000)
    expect(prisma.client.product.findMany.mock.calls[0]![0]).toMatchObject({ where: { isActive: true, deletedAt: null } })
  })

  it('snapshot: suma las subcategorías de marca a su categoría padre (H-55)', async () => {
    prisma.client.priceIndexSnapshot.findUnique.mockResolvedValue(null)
    prisma.client.settings.findUnique.mockResolvedValue({ value: '["sky","kontrol"]' })
    const llantas = { slug: 'llantas', name: 'Llantas' }
    prisma.client.product.findMany.mockResolvedValue([
      ...[1000, 2000, 3000].map((price) => ({ price, category: { slug: 'sky', name: 'SKY', parent: llantas } })),
      ...[4000, 5000].map((price) => ({ price, category: { slug: 'kontrol', name: 'Kontrol', parent: llantas } })),
    ])
    prisma.client.priceIndexSnapshot.upsert.mockImplementation(async (args: unknown) => args)
    const args = (await controller.snapshot()) as unknown as { create: { data: { categories: { slug: string; count: number }[] } } }
    expect(args.create.data.categories).toEqual([expect.objectContaining({ slug: 'llantas', count: 5 })])
  })

  it('snapshot: no regenera un corte ya publicado', async () => {
    prisma.client.priceIndexSnapshot.findUnique.mockResolvedValue({ id: 's1', isPublished: true })
    await expect(controller.snapshot()).rejects.toBeInstanceOf(UnprocessableEntityException)
    expect(prisma.client.priceIndexSnapshot.upsert).not.toHaveBeenCalled()
  })

  it('publish: rechaza un corte sin categorías publicables y conserva la fecha de primera publicación', async () => {
    prisma.client.priceIndexSnapshot.findUnique.mockResolvedValueOnce({ id: 's1', data: { categories: [] } })
    await expect(controller.publish('s1')).rejects.toBeInstanceOf(UnprocessableEntityException)

    const first = new Date('2026-01-01')
    prisma.client.priceIndexSnapshot.findUnique.mockResolvedValueOnce({ id: 's1', publishedAt: first, data: { categories: [{}] } })
    prisma.client.priceIndexSnapshot.update.mockImplementation(async (args: unknown) => args)
    const args = (await controller.publish('s1')) as unknown as { data: { publishedAt: Date } }
    expect(args.data.publishedAt).toBe(first)
  })

  it('publish / unpublish: 404 si el corte no existe', async () => {
    prisma.client.priceIndexSnapshot.findUnique.mockResolvedValue(null)
    await expect(controller.publish('x')).rejects.toBeInstanceOf(NotFoundException)
    await expect(controller.unpublish('x')).rejects.toBeInstanceOf(NotFoundException)
  })
})
