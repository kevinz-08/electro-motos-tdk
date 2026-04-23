import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaOrderRepository } from '@/infrastructure/repositories/PrismaOrderRepository'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { WompiService } from '@/infrastructure/services/WompiService'
import { MercadoPagoService } from '@/infrastructure/services/MercadoPagoService'
import { CreateOrder } from '@h2r/domain'
import { prisma } from '@/infrastructure/database/prisma-client'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    }),
  ).min(1),
  shippingAddress: z.object({
    fullName: z.string().min(1),
    address: z.string().min(1),
    city: z.string().min(1),
    department: z.string().min(1),
    phone: z.string().min(7),
    postalCode: z.string().optional(),
    notes: z.string().optional(),
  }),
  paymentProvider: z.enum(['WOMPI', 'MERCADO_PAGO']).default('WOMPI'),
})

/**
 * POST /api/orders
 *
 * Crea un nuevo pedido y prepara la transacción en la pasarela de pago seleccionada.
 * Requiere sesión activa — un usuario no autenticado no puede crear pedidos.
 *
 * Flujo:
 *   1. Verificar autenticación (session.user.id)
 *   2. Parsear y validar el body con Zod:
 *      - items: array de { productId, quantity }
 *      - shippingAddress: datos de envío completos
 *      - paymentProvider: 'WOMPI' | 'MERCADO_PAGO'
 *   3. Si paymentProvider es 'MERCADO_PAGO':
 *      verificar en la tabla Settings que MERCADOPAGO_ENABLED === 'true'
 *   4. Instanciar el servicio de pago correcto (WompiService o MercadoPagoService)
 *   5. Ejecutar el use case CreateOrder (valida stock, crea pedido, prepara pago)
 *   6. Retornar el pedido + datos de pago al cliente
 *
 * Respuestas posibles:
 *   201 → pedido creado + datos para el widget/redirect
 *   401 → sin sesión
 *   403 → MP no está habilitado
 *   404 → producto no encontrado
 *   409 → stock insuficiente
 *   422 → datos de entrada inválidos
 *   500 → error interno
 *   502 → error en la pasarela de pago
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!checkRateLimit(`orders:${session.user.id}`, 10, 60_000)) {
    return Response.json(
      { error: 'Demasiadas solicitudes. Intenta en un minuto.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { paymentProvider } = parsed.data

  // Si MP está seleccionado, verificar que esté habilitado
  if (paymentProvider === 'MERCADO_PAGO') {
    const setting = await prisma.settings.findUnique({ where: { key: 'MERCADOPAGO_ENABLED' } })
    if (setting?.value !== 'true') {
      return Response.json(
        { error: 'Mercado Pago no está habilitado' },
        { status: 403 },
      )
    }
  }

  const orderRepo = new PrismaOrderRepository()
  const productRepo = new PrismaProductRepository()
  const paymentService =
    paymentProvider === 'MERCADO_PAGO' ? new MercadoPagoService() : new WompiService()

  const useCase = new CreateOrder(orderRepo, productRepo, paymentService)
  const result = await useCase.execute({
    userId: session.user.id,
    items: parsed.data.items,
    shippingAddress: parsed.data.shippingAddress,
    paymentProvider,
  })

  if (!result.ok) {
    const statusByCode: Record<string, number> = {
      NOT_FOUND: 404,
      VALIDATION_ERROR: 422,
      STOCK_UNAVAILABLE: 409,
      PAYMENT_ERROR: 502,
      INTERNAL_ERROR: 500,
    }
    const status = statusByCode[result.error.code] ?? 500
    return Response.json({ error: result.error.message, code: result.error.code }, { status })
  }

  return Response.json(result.value, { status: 201 })
}
