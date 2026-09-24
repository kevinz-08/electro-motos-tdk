import { describe, it, expect, vi } from 'vitest'
import { summarizeReviews, publicAuthorName } from '@/domain/entities/ProductReview'
import { SubmitProductReview } from '@/domain/use-cases/reviews/SubmitProductReview'
import type { IReviewRepository, ReviewableOrderItem } from '@/domain/repositories/IReviewRepository'

describe('summarizeReviews', () => {
  it('retorna null sin reseñas', () => {
    expect(summarizeReviews([])).toBeNull()
  })

  it('calcula promedio (1 decimal) y porcentaje de recomendación', () => {
    expect(summarizeReviews([
      { rating: 5, recommends: true },
      { rating: 4, recommends: true },
      { rating: 2, recommends: false },
    ])).toEqual({ average: 3.7, count: 3, recommendPercent: 67 })
  })
})

describe('publicAuthorName', () => {
  it('primer nombre + inicial del apellido', () => {
    expect(publicAuthorName('carlos andrés pérez')).toBe('Carlos P.')
    expect(publicAuthorName('Ana')).toBe('Ana')
    expect(publicAuthorName('   ')).toBe('Cliente verificado')
  })
})

function makeRepo(item: ReviewableOrderItem | null) {
  return {
    findReviewableOrderItem: vi.fn().mockResolvedValue(item),
    motorcycleModelExists: vi.fn().mockImplementation(async (id: string) => id === 'model-1'),
    create: vi.fn().mockImplementation(async (input) => ({ id: 'rev-1', status: 'PENDING', createdAt: new Date(), ...input })),
    updateStatus: vi.fn(),
  } as unknown as IReviewRepository
}

const DELIVERED_ITEM: ReviewableOrderItem = {
  orderItemId: 'item-1',
  productId: 'prod-1',
  orderStatus: 'DELIVERED',
  buyerFullName: 'Laura Gómez',
  alreadyReviewed: false,
  buyerCity: null,
}

describe('SubmitProductReview', () => {
  it('crea la reseña PENDING con nombre público derivado', async () => {
    const repo = makeRepo(DELIVERED_ITEM)
    const result = await new SubmitProductReview(repo).execute({
      orderItemId: 'item-1', rating: 5, recommends: true, comment: '  Excelente  ',
    })
    expect(result.ok).toBe(true)
    expect(repo.create).toHaveBeenCalledWith({
      productId: 'prod-1', orderItemId: 'item-1', rating: 5, recommends: true,
      comment: 'Excelente', authorName: 'Laura G.', installedModelId: null, installedCity: null,
    })
  })

  it('guarda la moto declarada y la ciudad de entrega', async () => {
    const repo = makeRepo({ ...DELIVERED_ITEM, buyerCity: 'Cali' })
    const result = await new SubmitProductReview(repo).execute({
      orderItemId: 'item-1', rating: 5, recommends: true, installedModelId: 'model-1',
    })
    expect(result.ok).toBe(true)
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ installedModelId: 'model-1', installedCity: 'Cali' }))
  })

  it('no guarda la ciudad si no declaró moto', async () => {
    const repo = makeRepo({ ...DELIVERED_ITEM, buyerCity: 'Cali' })
    await new SubmitProductReview(repo).execute({ orderItemId: 'item-1', rating: 5, recommends: true })
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ installedModelId: null, installedCity: null }))
  })

  it('rechaza una moto inexistente sin crear la reseña', async () => {
    const repo = makeRepo(DELIVERED_ITEM)
    const result = await new SubmitProductReview(repo).execute({
      orderItemId: 'item-1', rating: 5, recommends: true, installedModelId: 'no-existe',
    })
    expect(result.ok).toBe(false)
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('rechaza calificaciones fuera de 1–5', async () => {
    const repo = makeRepo(DELIVERED_ITEM)
    for (const rating of [0, 6, 3.5]) {
      const result = await new SubmitProductReview(repo).execute({ orderItemId: 'item-1', rating, recommends: true })
      expect(result.ok).toBe(false)
    }
    expect(repo.findReviewableOrderItem).not.toHaveBeenCalled()
  })

  it('solo permite reseñar pedidos entregados', async () => {
    const repo = makeRepo({ ...DELIVERED_ITEM, orderStatus: 'SHIPPED' })
    const result = await new SubmitProductReview(repo).execute({ orderItemId: 'item-1', rating: 4, recommends: true })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN')
  })

  it('una reseña por ítem comprado', async () => {
    const repo = makeRepo({ ...DELIVERED_ITEM, alreadyReviewed: true })
    const result = await new SubmitProductReview(repo).execute({ orderItemId: 'item-1', rating: 4, recommends: true })
    expect(result.ok).toBe(false)
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('NOT_FOUND si el ítem no existe', async () => {
    const result = await new SubmitProductReview(makeRepo(null)).execute({ orderItemId: 'x', rating: 4, recommends: false })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('NOT_FOUND')
  })

  it('rechaza comentarios demasiado largos', async () => {
    const result = await new SubmitProductReview(makeRepo(DELIVERED_ITEM)).execute({
      orderItemId: 'item-1', rating: 4, recommends: true, comment: 'x'.repeat(1001),
    })
    expect(result.ok).toBe(false)
  })
})
