import { ProductReview, ReviewStatus } from '@/domain/entities/ProductReview'
import { OrderStatus } from '@/domain/entities/Order'

/** Datos del ítem comprado necesarios para decidir si se puede reseñar. */
export interface ReviewableOrderItem {
  orderItemId: string
  productId: string
  orderStatus: OrderStatus
  /** Nombre del destinatario del pedido — base del nombre público de la reseña. */
  buyerFullName: string
  /** true si el ítem ya tiene una reseña (cualquier estado). */
  alreadyReviewed: boolean
}

export interface CreateReviewInput {
  productId: string
  orderItemId: string
  rating: number
  recommends: boolean
  comment: string | null
  authorName: string
}

/**
 * Contrato de acceso a datos de reseñas (README §22.6).
 * Implementado por PrismaReviewRepository en apps/api.
 */
export interface IReviewRepository {
  findReviewableOrderItem(orderItemId: string): Promise<ReviewableOrderItem | null>
  /** Crea la reseña en estado PENDING. */
  create(input: CreateReviewInput): Promise<ProductReview>
  updateStatus(id: string, status: ReviewStatus): Promise<ProductReview>
}
