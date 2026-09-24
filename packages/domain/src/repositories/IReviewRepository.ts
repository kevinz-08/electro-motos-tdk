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
  /** Ciudad de entrega del pedido, para "Le sirvió a una DR150 · Cali". Null si no consta. */
  buyerCity: string | null
}

export interface CreateReviewInput {
  productId: string
  orderItemId: string
  rating: number
  recommends: boolean
  comment: string | null
  authorName: string
  installedModelId: string | null
  installedCity: string | null
}

/**
 * Contrato de acceso a datos de reseñas (README §22.6).
 * Implementado por PrismaReviewRepository en apps/api.
 */
export interface IReviewRepository {
  findReviewableOrderItem(orderItemId: string): Promise<ReviewableOrderItem | null>
  /** true si existe un MotorcycleModel activo con ese id. */
  motorcycleModelExists(modelId: string): Promise<boolean>
  /** Crea la reseña en estado PENDING. */
  create(input: CreateReviewInput): Promise<ProductReview>
  updateStatus(id: string, status: ReviewStatus): Promise<ProductReview>
}
