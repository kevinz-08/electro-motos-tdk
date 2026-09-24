import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@h2r/database', () => ({
  prisma: { client: {} },
  PrismaClient: vi.fn(),
}))

import { HttpException } from '@nestjs/common'
import type { ICrossSellRepository } from '@h2r/domain'
import { AdminProductsController } from '../admin/admin-products.controller'

const product = (id: string, extra: Record<string, unknown> = {}) => ({
  id, name: `Producto ${id}`, sku: `SKU-${id}`, price: 1000000, stock: 5, isActive: true, images: [`img-${id}`], ...extra,
})

describe('AdminProductsController — venta cruzada', () => {
  const crossSellRepo = {
    findByProduct: vi.fn(),
    replaceForProduct: vi.fn(),
    appendIfRoom: vi.fn(),
    findExistingProductIds: vi.fn(),
  }
  const prisma = { client: { product: { findMany: vi.fn() } } }
  let controller: AdminProductsController

  beforeEach(() => {
    vi.resetAllMocks()
    controller = new AdminProductsController(
      {} as never,
      {} as never,
      crossSellRepo as unknown as ICrossSellRepository,
      prisma as never,
      {} as never,
      {} as never,
    )
  })

  it('search: menos de 2 caracteres no consulta la base', async () => {
    expect(await controller.searchProducts('a')).toEqual([])
    expect(prisma.client.product.findMany).not.toHaveBeenCalled()
  })

  it('search: excluye borrados y el propio producto, y devuelve una sola imagen', async () => {
    prisma.client.product.findMany.mockResolvedValue([product('B')])
    const out = await controller.searchProducts('pastillas', 'A')
    const where = prisma.client.product.findMany.mock.calls[0]![0].where
    expect(where.deletedAt).toBeNull()
    expect(where.id).toEqual({ not: 'A' })
    expect(out).toEqual([expect.objectContaining({ id: 'B', image: 'img-B' })])
    expect(out[0]).not.toHaveProperty('images')
  })

  it('GET: une vínculos con productos y omite los que ya no existen', async () => {
    crossSellRepo.findByProduct.mockResolvedValue([
      { productId: 'A', relatedId: 'B', reason: 'Va con las pastillas', order: 0 },
      { productId: 'A', relatedId: 'X', reason: null, order: 1 },
    ])
    prisma.client.product.findMany.mockResolvedValue([product('B', { stock: 0 })])
    const out = await controller.getCrossSells('A')
    expect(out).toEqual([expect.objectContaining({ id: 'B', reason: 'Va con las pastillas', order: 0, stock: 0 })])
  })

  it('PUT: guarda y devuelve el resultado del sentido inverso', async () => {
    crossSellRepo.findExistingProductIds.mockResolvedValue(['A', 'B'])
    crossSellRepo.appendIfRoom.mockResolvedValue('added')
    const out = await controller.setCrossSells('A', { items: [{ relatedId: 'B', reciprocal: true }] })
    expect(out).toEqual({ saved: 1, reciprocal: { added: ['B'], alreadyLinked: [], full: [] } })
  })

  it('PUT: un error de dominio se traduce a HTTP 422', async () => {
    crossSellRepo.findExistingProductIds.mockResolvedValue(['A'])
    await expect(controller.setCrossSells('A', { items: [{ relatedId: 'B' }] })).rejects.toMatchObject({
      constructor: HttpException,
      status: 422,
    })
  })
})
