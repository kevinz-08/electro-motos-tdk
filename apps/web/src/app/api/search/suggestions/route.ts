import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@h2r/database'
import { searchDocs } from '@h2r/domain'
import { getCachedSearchIndex } from '@/lib/search-index'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ''

const TRANSFORMS = 'f_auto,q_auto,w_200,c_limit'

function toImageUrl(publicIdOrUrl: string | undefined): string | null {
  if (!publicIdOrUrl) return null
  if (publicIdOrUrl.startsWith('http')) {
    // Inyectar transformaciones si ya es URL de Cloudinary
    const match = publicIdOrUrl.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/)
    if (match) return `${match[1]}${TRANSFORMS}/${publicIdOrUrl.slice(match[1].length).replace(/^[^v][^/]*\//, '')}`
    return publicIdOrUrl
  }
  if (!CLOUD_NAME) return null
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${TRANSFORMS}/${publicIdOrUrl}`
}

function toCOP(cents: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(cents / 100)
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  // Ranking por relevancia sobre el índice (normalizado y tolerante a typos, README §24);
  // Prisma solo trae los datos de presentación de los 6 ganadores.
  const index = await getCachedSearchIndex()
  const topIds = searchDocs(index, q, { filter: (d) => d.isActive, limit: 6 }).map((h) => h.id)
  if (topIds.length === 0) return NextResponse.json({ results: [] })

  const rows = await prisma.product.findMany({
    where: { id: { in: topIds }, isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      stock: true,
      category: { select: { name: true, slug: true } },
    },
  })
  const byId = new Map(rows.map((r) => [r.id, r]))
  const products = topIds.flatMap((id) => {
    const row = byId.get(id)
    return row ? [row] : []
  })

  const results = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    priceLabel: toCOP(p.price),
    image: toImageUrl(p.images[0]),
    stock: p.stock,
    categoryName: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
  }))

  return NextResponse.json({ results })
}
