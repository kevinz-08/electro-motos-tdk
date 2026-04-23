import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaOrderRepository } from '@/infrastructure/repositories/PrismaOrderRepository'
import { OrderStatus } from '@h2r/domain'
import { z } from 'zod'

const bodySchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
})

/**
 * PATCH /api/orders/:id/status
 * Solo ADMIN puede cambiar el estado manualmente.
 */
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const repo = new PrismaOrderRepository()
  const order = await repo.findById(id)
  if (!order) {
    return Response.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  await repo.updateStatus(id, parsed.data.status as OrderStatus)
  return Response.json({ success: true, status: parsed.data.status })
}
