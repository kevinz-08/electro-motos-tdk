import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@h2r/database', () => ({
  prisma: { client: {} },
  PrismaClient: vi.fn(),
}))

import { ForbiddenException } from '@nestjs/common'
import { ReviewsController } from '../reviews/reviews.controller'
import { ReviewRequestService } from '../infrastructure/services/ReviewRequestService'
import { signReviewToken, signOrderAccessToken } from '../shared/order-access-token'
import type { IReviewRepository } from '@h2r/domain'
import type { PrismaService } from '../infrastructure/database/prisma.service'
import type { EmailQueueService } from '../infrastructure/services/EmailQueueService'

// ── ReviewsController ─────────────────────────────────────────────────────────

describe('ReviewsController.submit', () => {
  const reviewRepo = {
    findReviewableOrderItem: vi.fn(),
    motorcycleModelExists: vi.fn().mockResolvedValue(true),
    create: vi.fn(),
    updateStatus: vi.fn(),
  }
  const controller = new ReviewsController(
    reviewRepo as unknown as IReviewRepository,
    {} as PrismaService,
  )

  beforeEach(() => vi.clearAllMocks())

  it('rechaza un token inválido sin tocar la BD', async () => {
    await expect(controller.submit({
      orderItemId: 'item-1', token: 'falso', rating: 5, recommends: true,
    })).rejects.toThrow(ForbiddenException)
    expect(reviewRepo.findReviewableOrderItem).not.toHaveBeenCalled()
  })

  it('rechaza el token de acceso al pedido usado como token de reseña', async () => {
    await expect(controller.submit({
      orderItemId: 'item-1', token: signOrderAccessToken('item-1'), rating: 5, recommends: true,
    })).rejects.toThrow(ForbiddenException)
  })

  it('crea la reseña PENDING con un token válido y pedido entregado', async () => {
    reviewRepo.findReviewableOrderItem.mockResolvedValue({
      orderItemId: 'item-1', productId: 'prod-1', orderStatus: 'DELIVERED', buyerFullName: 'Ana Ruiz', alreadyReviewed: false, buyerCity: 'Cali',
    })
    reviewRepo.create.mockImplementation(async (input) => ({ id: 'rev-1', status: 'PENDING', createdAt: new Date(), ...input }))

    const result = await controller.submit({
      orderItemId: 'item-1', token: signReviewToken('item-1'), rating: 4, recommends: true, comment: 'Muy bueno',
    })

    expect(result).toEqual({ id: 'rev-1', status: 'PENDING' })
    expect(reviewRepo.create).toHaveBeenCalledWith(expect.objectContaining({ authorName: 'Ana R.', rating: 4 }))
  })
})

// ── ReviewRequestService ──────────────────────────────────────────────────────

describe('ReviewRequestService.scheduleReviewRequests', () => {
  function setup(claimCounts: number[]) {
    const findMany = vi.fn().mockResolvedValue([
      { id: 'order-1', contactEmail: 'a@test.com' },
      { id: 'order-2', contactEmail: 'b@test.com' },
    ])
    const updateMany = vi.fn()
    claimCounts.forEach((count) => updateMany.mockResolvedValueOnce({ count }))
    const prisma = { client: { order: { findMany, updateMany } } } as unknown as PrismaService
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const service = new ReviewRequestService(prisma, { enqueue } as unknown as EmailQueueService)
    return { service, findMany, updateMany, enqueue }
  }

  it('encola REVIEW_REQUEST por cada pedido reclamado', async () => {
    const { service, enqueue } = setup([1, 1])
    const scheduled = await service.scheduleReviewRequests(new Date('2026-09-16T12:00:00Z'))
    expect(scheduled).toBe(2)
    expect(enqueue).toHaveBeenCalledWith('a@test.com', 'order-1', 'REVIEW_REQUEST')
  })

  it('no encola un pedido que otra instancia ya reclamó', async () => {
    const { service, enqueue } = setup([0, 1])
    const scheduled = await service.scheduleReviewRequests()
    expect(scheduled).toBe(1)
    expect(enqueue).toHaveBeenCalledTimes(1)
    expect(enqueue).toHaveBeenCalledWith('b@test.com', 'order-2', 'REVIEW_REQUEST')
  })

  it('solo busca pedidos DELIVERED sin solicitud previa', async () => {
    const { service, findMany } = setup([1, 1])
    await service.scheduleReviewRequests()
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'DELIVERED', reviewRequestedAt: null }),
    }))
  })
})
