'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@h2r/database'
import { canAccessOrder } from '@/lib/queries/getOrderConfirmation'

/** Estado del pedido para el poller — dueño con sesión o enlace firmado (invitados). */
export async function getOrderStatus(orderId: string, token?: string | null): Promise<string | null> {
  const session = await auth()

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, status: true },
  })
  if (!order || !canAccessOrder(order, { userId: session?.user?.id, token })) return null

  return order.status
}
