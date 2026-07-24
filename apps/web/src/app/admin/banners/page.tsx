import type { Metadata } from 'next'
import { prisma } from '@/infrastructure/database/prisma-client'
import { BannerManager, type BannerRow } from '@/components/admin/BannerManager'

export const metadata: Metadata = { title: 'Banners' }

export default async function AdminBannersPage() {
  const rows = await prisma.heroBanner.findMany({ orderBy: { order: 'asc' } })

  const banners: BannerRow[] = rows.map((r) => ({
    id: r.id,
    imageUrl: r.imageUrl,
    imagePublicId: r.imagePublicId,
    title: r.title,
    description: r.description,
    ctaLabel: r.ctaLabel,
    ctaUrl: r.ctaUrl,
    order: r.order,
    isActive: r.isActive,
  }))

  return <BannerManager banners={banners} />
}
