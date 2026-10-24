import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/infrastructure/database/prisma-client'
import { CACHE_TAGS } from '@/lib/cache'
import { productTag } from '@/lib/cache-tags'

/** Las tarjetas de producto solo cambian con stock 0 o 1 (ver ProductCard). */
const CARD_STOCK_THRESHOLD = 1

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const before = await prisma.product.findUnique({ where: { id }, select: { slug: true, stock: true } })

  const upstream = await fetch(`${API_BASE}/admin/products/${id}/stock`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.user.accessToken}`,
    },
    body: JSON.stringify(body),
  })

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({}))
    return NextResponse.json(data, { status: upstream.status })
  }

  // Solo la ficha, salvo que el stock cruce el umbral de las tarjetas (Agotado /
  // Última unidad): entonces cambian también los listados (README §27).
  const after = await prisma.product.findUnique({ where: { id }, select: { slug: true, stock: true } })
  const changesCards =
    !before || !after || before.stock <= CARD_STOCK_THRESHOLD || after.stock <= CARD_STOCK_THRESHOLD
  const tags = changesCards
    ? [CACHE_TAGS.products]
    : [...new Set([productTag(before.slug), productTag(after.slug)])]
  for (const tag of tags) revalidateTag(tag, { expire: 0 })

  const data = await upstream.json()
  return NextResponse.json(data)
}
