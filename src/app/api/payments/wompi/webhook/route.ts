import { NextRequest } from 'next/server'
import { WompiService } from '@/infrastructure/services/WompiService'
import { PrismaOrderRepository } from '@/infrastructure/repositories/PrismaOrderRepository'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { ConfirmPayment } from '@/domain/use-cases/orders/ConfirmPayment'
import { ResendEmailService } from '@/infrastructure/services/ResendEmailService'
import { prisma } from '@/infrastructure/database/prisma-client'
import { PaymentStatus } from '@/domain/entities/Order'

/**
 * POST /api/payments/wompi/webhook
 *
 * Endpoint que recibe los eventos de pago enviados por Wompi a nuestro servidor.
 * Wompi envía este webhook cuando una transacción cambia de estado.
 *
 * SEGURIDAD: Este endpoint valida la firma criptográfica del evento antes de procesarlo.
 * Si un atacante envía una petición falsa a esta URL, será rechazada con 401.
 *
 * IDEMPOTENCIA: Si Wompi envía el mismo evento más de una vez (reintentos),
 * el use case ConfirmPayment verifica que el pedido no haya sido procesado ya.
 *
 * Flujo completo:
 *   1. Parsear el body JSON
 *   2. Validar la firma SHA256 del evento (WompiService.validateWebhook)
 *      → 401 si la firma no coincide
 *   3. Verificar que sea un evento de tipo "transaction.*"
 *   4. Extraer el orderId de la referencia "ORDER-{orderId}-{timestamp}"
 *   5. Mapear el status de Wompi al PaymentStatus del dominio
 *   6. Llamar a ConfirmPayment use case
 *   7. Si APPROVED: enviar email de confirmación al cliente (fire-and-forget)
 *   8. Retornar 200 siempre (incluso en errores propios) para que Wompi no reintente
 *
 * IMPORTANTE: Retornamos 200 aunque haya un error interno propio.
 * Si retornamos 4xx/5xx, Wompi reintentará el webhook múltiples veces.
 * Es mejor log del error y retornar 200 que inundar el sistema con reintentos.
 * La excepción es la firma inválida (401), que sí queremos rechazar.
 *
 * Referencia de la documentación de Wompi:
 * @see https://docs.wompi.co/docs/colombia/eventos-de-pago/
 */
export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  // 1. Validar firma del webhook
  const wompiService = new WompiService()
  if (!wompiService.validateWebhook(payload, request.headers)) {
    return Response.json({ error: 'Firma inválida' }, { status: 401 })
  }

  // 2. Extraer datos de la transacción
  const event = payload as {
    event: string
    data: {
      transaction: {
        id: string
        reference: string
        status: string
      }
    }
  }

  // Solo procesar eventos de transacción
  if (!event.event?.startsWith('transaction.')) {
    return Response.json({ received: true, processed: false })
  }

  const transaction = event.data?.transaction
  if (!transaction) {
    return Response.json({ error: 'Evento sin datos de transacción' }, { status: 400 })
  }

  // Extraer orderId de la referencia: "ORDER-{orderId}-{timestamp}"
  const referenceParts = transaction.reference?.split('-')
  if (!referenceParts || referenceParts.length < 2 || referenceParts[0] !== 'ORDER') {
    return Response.json({ error: 'Referencia inválida' }, { status: 400 })
  }
  const orderId = referenceParts[1]

  if (!orderId) {
    return Response.json({ error: 'orderId no encontrado en referencia' }, { status: 400 })
  }

  const statusMap: Record<string, PaymentStatus> = {
    APPROVED: 'APPROVED',
    DECLINED: 'DECLINED',
    VOIDED: 'VOIDED',
    ERROR: 'ERROR',
    PENDING: 'PENDING',
  }
  const paymentStatus: PaymentStatus = statusMap[transaction.status] ?? 'ERROR'

  // 3. Confirmar pago vía use case
  const orderRepo = new PrismaOrderRepository()
  const productRepo = new PrismaProductRepository()
  const confirmPayment = new ConfirmPayment(orderRepo, productRepo)

  const result = await confirmPayment.execute({
    orderId,
    externalId: transaction.id,
    status: paymentStatus,
  })

  if (!result.ok) {
    // Log del error sin exponer detalles al exterior
    console.error('[Wompi webhook] ConfirmPayment error:', result.error.message)
    // Retornar 200 para que Wompi no reintente — el error es de nuestro lado
    return Response.json({ received: true, error: result.error.code }, { status: 200 })
  }

  // 4. Enviar email si el pago fue aprobado
  if (paymentStatus === 'APPROVED') {
    const order = await orderRepo.findById(orderId)
    if (order) {
      const user = await prisma.user.findUnique({ where: { id: order.userId } })
      if (user?.email) {
        const emailService = new ResendEmailService()
        // Fire-and-forget — no bloquear la respuesta al webhook
        emailService.sendOrderConfirmation(order, user.email).catch((e) => {
          console.error('[Wompi webhook] Error enviando email:', e)
        })
      }
    }
  }

  return Response.json({ received: true })
}
