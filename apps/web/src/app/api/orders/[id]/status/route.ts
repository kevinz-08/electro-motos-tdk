import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/infrastructure/database/prisma-client'

const VALID_STATUSES = ['PENDING', 'PAID', 'AWAITING_DEPOSIT', 'COD_CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const
type Status = typeof VALID_STATUSES[number]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { status } = body as { status?: string }

  if (!status || !VALID_STATUSES.includes(status as Status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({ where: { id }, select: { id: true, paymentProvider: true } })
  if (!order) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  // Estados de contraentrega y de pago en línea no se mezclan.
  const isCod = order.paymentProvider === 'COD'
  const codOnly = status === 'AWAITING_DEPOSIT' || status === 'COD_CONFIRMED'
  const onlineOnly = status === 'PENDING' || status === 'PAID'
  if ((isCod && onlineOnly) || (!isCod && codOnly)) {
    return NextResponse.json(
      { error: isCod ? 'Un pedido contraentrega no puede pasar a estados de pago en línea' : 'Ese estado es exclusivo de contraentrega' },
      { status: 400 },
    )
  }

  await prisma.order.update({ where: { id }, data: { status: status as Status } })

  return NextResponse.json({ success: true, status })
}
