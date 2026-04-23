/**
 * PATCH /api/admin/products/[id]/stock
 *
 * Actualiza el stock de un producto individual. Requiere rol ADMIN.
 *
 * Es un endpoint separado de PUT /api/admin/products/[id] porque la actualización
 * de stock es una operación muy frecuente (puede ocurrir varias veces al día)
 * y no queremos requerir enviar todos los campos del producto para solo cambiar el stock.
 *
 * Body: { "stock": 50 }   ← número entero >= 0
 *
 * También lo usa el importador CSV via PATCH /api/admin/stock/bulk que
 * actúa sobre varios productos a la vez por SKU (más eficiente para muchos productos).
 *
 * Usado por: StockUpdateForm del panel admin de productos.
 */
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { z } from 'zod'

const bodySchema = z.object({ stock: z.number().int().min(0) })

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  const user = session?.user as ({ role?: string } & NonNullable<typeof session>['user'])
  if (!session?.user || user.role !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json() as unknown
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const repo = new PrismaProductRepository()
  await repo.updateStock(id, parsed.data.stock)
  return Response.json({ success: true })
}
