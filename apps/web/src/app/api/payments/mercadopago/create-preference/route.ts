import { NextRequest } from 'next/server'
import { z } from 'zod'
import { MercadoPagoService } from '@/infrastructure/services/MercadoPagoService'
import { PrismaOrderRepository } from '@/infrastructure/repositories/PrismaOrderRepository'
import { prisma } from '@/infrastructure/database/prisma-client'

const bodySchema = z.object({
  orderId: z.string().min(1),
})

/**
 * POST /api/payments/mercadopago/create-preference
 *
 * Crea una preference en Mercado Pago para un pedido existente.
 * Solo disponible si Settings.MERCADOPAGO_ENABLED = 'true'.
 */
export async function POST(request: NextRequest) {
  // Verificar si Mercado Pago está habilitado
  const setting = await prisma.settings.findUnique({
    where: { key: 'MERCADOPAGO_ENABLED' },
  })
  if (setting?.value !== 'true') {
    return Response.json(
      { error: 'Mercado Pago no está habilitado como método de pago' },
      { status: 403 },
    )
  }

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

  const orderRepo = new PrismaOrderRepository()
  const order = await orderRepo.findById(parsed.data.orderId)
  if (!order) {
    return Response.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }

  try {
    const mpService = new MercadoPagoService()
    const result = await mpService.createTransaction(order)
    return Response.json(result)
  } catch (e) {
    console.error('[MP create-preference]', e)
    return Response.json({ error: 'Error al crear preference en Mercado Pago' }, { status: 500 })
  }
}
