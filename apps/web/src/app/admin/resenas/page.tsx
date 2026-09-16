import type { Metadata } from 'next'
import { prisma } from '@/infrastructure/database/prisma-client'
import { ReviewModeration, type ReviewRow } from '@/components/admin/ReviewModeration'

export const metadata: Metadata = { title: 'Reseñas' }

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const { status: rawStatus } = await searchParams
  const status = (STATUSES as readonly string[]).includes(rawStatus ?? '') ? rawStatus! : 'PENDING'

  const [rows, counts] = await Promise.all([
    prisma.productReview.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { product: { select: { name: true, slug: true } } },
    }),
    prisma.productReview.groupBy({ by: ['status'], _count: true }),
  ])

  const reviews: ReviewRow[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    recommends: r.recommends,
    comment: r.comment,
    authorName: r.authorName,
    status: r.status as ReviewRow['status'],
    createdAt: r.createdAt.toISOString(),
    productName: r.product.name,
    productSlug: r.product.slug,
  }))

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count])) as Record<string, number>

  return <ReviewModeration reviews={reviews} activeStatus={status as ReviewRow['status']} counts={countByStatus} />
}
