import { NextRequest, NextResponse } from 'next/server'
import { getCachedVendeloCities } from '@/lib/cache'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) {
    return NextResponse.json([])
  }

  // Tabla entera en caché y filtro en memoria, equivalente al `contains` +
  // `mode: 'insensitive'` que se hacía en Postgres en cada tecla (README §27).
  const needle = q.toLocaleLowerCase('es-CO')
  const cities = (await getCachedVendeloCities())
    .filter((c) => c.name.toLocaleLowerCase('es-CO').includes(needle))
    .slice(0, 10)

  return NextResponse.json(cities)
}
