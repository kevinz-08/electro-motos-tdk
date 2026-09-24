import { Injectable } from '@nestjs/common'
import {
  IReviewRepository,
  CreateReviewInput,
  ReviewableOrderItem,
  ProductReview,
  ReviewStatus,
  OrderStatus,
} from '@h2r/domain'
import { PrismaService } from '../database/prisma.service'

type PrismaReviewRow = {
  id: string; productId: string; orderItemId: string; rating: number; recommends: boolean
  comment: string | null; authorName: string; status: string; createdAt: Date
  installedModelId: string | null; installedCity: string | null
}

function toDomain(r: PrismaReviewRow): ProductReview {
  return {
    id: r.id,
    productId: r.productId,
    orderItemId: r.orderItemId,
    rating: r.rating,
    recommends: r.recommends,
    comment: r.comment,
    authorName: r.authorName,
    status: r.status as ReviewStatus,
    createdAt: r.createdAt,
    installedModelId: r.installedModelId,
    installedCity: r.installedCity,
  }
}

@Injectable()
export class PrismaReviewRepository implements IReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findReviewableOrderItem(orderItemId: string): Promise<ReviewableOrderItem | null> {
    const item = await this.prisma.client.orderItem.findUnique({
      where: { id: orderItemId },
      select: {
        id: true,
        productId: true,
        order: { select: { status: true, shippingAddress: true } },
        review: { select: { id: true } },
      },
    })
    if (!item) return null
    const address = item.order.shippingAddress as { fullName?: string; city?: string } | null
    return {
      orderItemId: item.id,
      productId: item.productId,
      orderStatus: item.order.status as OrderStatus,
      buyerFullName: address?.fullName ?? '',
      alreadyReviewed: item.review !== null,
      buyerCity: address?.city?.trim() || null,
    }
  }

  async motorcycleModelExists(modelId: string): Promise<boolean> {
    const model = await this.prisma.client.motorcycleModel.findFirst({
      where: { id: modelId, isActive: true },
      select: { id: true },
    })
    return model !== null
  }

  async create(input: CreateReviewInput): Promise<ProductReview> {
    const r = await this.prisma.client.productReview.create({ data: input })
    return toDomain(r)
  }

  async updateStatus(id: string, status: ReviewStatus): Promise<ProductReview> {
    const r = await this.prisma.client.productReview.update({
      where: { id },
      data: { status, moderatedAt: new Date() },
    })
    return toDomain(r)
  }
}
