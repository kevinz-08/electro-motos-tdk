/**
 * GET /api/cross-sells?ids=a,b,c — sugerencias para el carrito.
 *
 * El carrito vive en localStorage, así que solo el cliente sabe qué hay en él:
 * manda los ids y este endpoint devuelve las sugerencias de todos, sin lo que ya
 * está en el carrito y sin repetidos. Devuelve hasta `CART_CANDIDATES` porque el
 * filtro por la moto del comprador se aplica DESPUÉS, en el cliente (cookie), y
 * cortar en 4 aquí podría dejar el bloque vacío tras filtrar.
 *
 * Solo lectura y sin datos personales: se cachea en el borde 5 minutos.
 */
import { NextRequest, NextResponse } from 'next/server'
import { mergeCartCrossSells } from '@h2r/domain'
import { getCachedCrossSells } from '@/lib/cache'

const MAX_IDS = 20
const CART_CANDIDATES = 12
const ID_PATTERN = /^[A-Za-z0-9_-]{8,40}$/

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('ids') ?? ''
  const ids = [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))]

  if (ids.length === 0 || ids.length > MAX_IDS || !ids.every((id) => ID_PATTERN.test(id))) {
    return NextResponse.json({ error: 'ids inválidos' }, { status: 400 })
  }

  let groups: Array<{ productId: string; suggestions: Awaited<ReturnType<typeof getCachedCrossSells>> }>
  try {
    groups = await Promise.all(
      ids.map(async (productId) => ({ productId, suggestions: await getCachedCrossSells(productId) })),
    )
  } catch (e) {
    // Complemento opcional: ante un fallo se responde vacío y sin caché.
    console.error('[cross-sell] no se pudieron leer las sugerencias del carrito', e)
    return NextResponse.json({ suggestions: [] }, { headers: { 'Cache-Control': 'no-store' } })
  }

  return NextResponse.json(
    { suggestions: mergeCartCrossSells(groups, ids, CART_CANDIDATES) },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
  )
}
