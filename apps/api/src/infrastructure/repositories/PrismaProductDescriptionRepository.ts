import { Injectable } from '@nestjs/common'
import { IProductDescriptionRepository, ProductDescription, UpsertDescriptionInput } from '@h2r/domain'
import { PrismaService } from '../database/prisma.service'

type PrismaDescRow = {
  id: string
  productId: string
  generalDescription: string | null
  createdAt: Date
  updatedAt: Date
  benefits: Array<{ id: string; title: string | null; body: string; order: number }>
}

function toDomain(row: PrismaDescRow): ProductDescription {
  return {
    id: row.id,
    productId: row.productId,
    generalDescription: row.generalDescription ?? undefined,
    benefits: row.benefits
      .sort((a, b) => a.order - b.order)
      .map((b) => ({
        id: b.id,
        title: b.title ?? undefined,
        body: b.body,
        order: b.order,
      })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

@Injectable()
export class PrismaProductDescriptionRepository implements IProductDescriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProductId(productId: string): Promise<ProductDescription | null> {
    const row = await this.prisma.client.productDescription.findUnique({
      where: { productId },
      include: { benefits: true },
    })
    return row ? toDomain(row) : null
  }

  async upsert(input: UpsertDescriptionInput): Promise<ProductDescription> {
    const row = await this.prisma.client.$transaction(async (tx) => {
      const desc = await tx.productDescription.upsert({
        where: { productId: input.productId },
        create: {
          productId: input.productId,
          generalDescription: input.generalDescription ?? null,
        },
        update: {
          generalDescription: input.generalDescription ?? null,
        },
        select: { id: true },
      })

      // Reemplazar beneficios completos — lista pequeña (max 10), delete+recreate es más simple que diff
      await tx.productBenefit.deleteMany({ where: { descriptionId: desc.id } })

      if (input.benefits.length > 0) {
        await tx.productBenefit.createMany({
          data: input.benefits.map((b) => ({
            descriptionId: desc.id,
            title: b.title ?? null,
            body: b.body,
            order: b.order,
          })),
        })
      }

      return tx.productDescription.findUniqueOrThrow({
        where: { id: desc.id },
        include: { benefits: true },
      })
    })

    return toDomain(row)
  }
}
