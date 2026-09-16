import { IReviewRepository } from '@/domain/repositories/IReviewRepository'
import {
  ProductReview,
  REVIEW_COMMENT_MAX_LENGTH,
  publicAuthorName,
} from '@/domain/entities/ProductReview'
import { Result, ok, err, AppError } from '@/domain/shared/Result'

export interface SubmitProductReviewInput {
  /** El caller ya verificó el token firmado del enlace para este orderItemId. */
  orderItemId: string
  rating: number
  recommends: boolean
  comment?: string | null
}

/**
 * Use case: registrar una reseña verificada (README §22.6).
 *
 * Reglas:
 *   1. rating entero 1–5; comentario opcional ≤ 1000 caracteres.
 *   2. El ítem existe y su pedido está DELIVERED (solo quien recibió el producto reseña).
 *   3. Una reseña por ítem comprado.
 *   4. El nombre público se deriva del destinatario ("Carlos P.") — nunca lo escribe el cliente.
 *   5. Nace PENDING: no cuenta para el rating hasta que el admin la apruebe.
 */
export class SubmitProductReview {
  constructor(private readonly reviewRepo: IReviewRepository) {}

  async execute(input: SubmitProductReviewInput): Promise<Result<ProductReview>> {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      return err(new AppError('VALIDATION_ERROR', 'La calificación debe ser de 1 a 5 estrellas'))
    }
    const comment = input.comment?.trim() || null
    if (comment && comment.length > REVIEW_COMMENT_MAX_LENGTH) {
      return err(new AppError('VALIDATION_ERROR', `El comentario admite máximo ${REVIEW_COMMENT_MAX_LENGTH} caracteres`))
    }

    const item = await this.reviewRepo.findReviewableOrderItem(input.orderItemId)
    if (!item) {
      return err(new AppError('NOT_FOUND', 'No encontramos este producto en tus pedidos'))
    }
    if (item.orderStatus !== 'DELIVERED') {
      return err(new AppError('FORBIDDEN', 'Podrás calificar el producto cuando tu pedido sea entregado'))
    }
    if (item.alreadyReviewed) {
      return err(new AppError('VALIDATION_ERROR', 'Ya calificaste este producto. ¡Gracias!'))
    }

    try {
      const review = await this.reviewRepo.create({
        productId: item.productId,
        orderItemId: item.orderItemId,
        rating: input.rating,
        recommends: input.recommends,
        comment,
        authorName: publicAuthorName(item.buyerFullName),
      })
      return ok(review)
    } catch (e) {
      return err(new AppError('INTERNAL_ERROR', 'No se pudo guardar la reseña', e))
    }
  }
}
