import { NextRequest } from 'next/server'
import { WompiService } from '@/infrastructure/services/WompiService'
import { PrismaOrderRepository } from '@/infrastructure/repositories/PrismaOrderRepository'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { ConfirmPayment } from '@h2r/domain'
import { ResendEmailService } from '@/infrastructure/services/ResendEmailService'
import { prisma } from '@/infrastructure/database/prisma-client'
import { PaymentStatus } from '@h2r/domain'

/**
 * POST /api/payments/wompi/webhook
 *
 * Endpoint que recibe los eventos de pago enviados por Wompi.
 *
 * Seguridad:
 *   1. Valida la firma criptográfica del evento (SHA256) contra WOMPI_EVENTS_SECRET.
 *   2. Rechaza eventos con timestamp fuera de ventana (anti-replay, ver WompiService).
 *   3. Valida que `amount_in_cents` del evento coincida con Order.total (defensa en profundidad).
 *
 * Idempotencia:
 *   ConfirmPayment aplica la transición PENDING → PAID/CANCELLED mediante un
 *   `updateMany WHERE status='PENDING'` atómico. Si Wompi reintenta el mismo webhook,
 *   el segundo llamado no cambia nada y no dispara efectos secundarios (email).
 *
 * Respuestas HTTP:
 *   200 → evento procesado (o duplicado idempotente, o ignorado por no ser transaction.*)
 *   401 → firma inválida o expirada (único caso donde rechazamos explícitamente)
 *   Todos los demás errores retornan 200 con `error` en el body para evitar reintentos
 *   masivos de Wompi ante fallos transitorios de nuestro lado.
 *
 * @see https://docs.wompi.co/docs/colombia/eventos-de-pago/
 */
export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    console.warn('[Wompi webhook] Body no es JSON válido')
    return Response.json({ received: true, error: 'invalid_body' }, { status: 200 })
  }

  const wompiService = new WompiService()
  if (!wompiService.validateWebhook(payload, request.headers)) {
    return Response.json({ error: 'Firma inválida' }, { status: 401 })
  }

  const event = payload as {
    event?: string
    data?: {
      transaction?: {
        id?: string
        reference?: string
        status?: string
        amount_in_cents?: number
      }
    }
  }

  if (!event.event?.startsWith('transaction.')) {
    return Response.json({ received: true, processed: false })
  }

  const transaction = event.data?.transaction
  if (!transaction?.id || !transaction.reference || !transaction.status) {
    console.warn('[Wompi webhook] Evento sin campos requeridos de transacción')
    return Response.json({ received: true, error: 'missing_transaction_fields' }, { status: 200 })
  }

  // "ORDER-{orderId}-{timestamp}" → orderId. Regex robusto por si el cuid cambia.
  const refMatch = transaction.reference.match(/^ORDER-(.+)-(\d+)$/)
  if (!refMatch || !refMatch[1]) {
    console.warn(`[Wompi webhook] Referencia inválida: "${transaction.reference}"`)
    return Response.json({ received: true, error: 'invalid_reference' }, { status: 200 })
  }
  const orderId = refMatch[1]

  const statusMap: Record<string, PaymentStatus> = {
    APPROVED: 'APPROVED',
    DECLINED: 'DECLINED',
    VOIDED: 'VOIDED',
    ERROR: 'ERROR',
    PENDING: 'PENDING',
  }
  const paymentStatus: PaymentStatus = statusMap[transaction.status] ?? 'ERROR'

  const orderRepo = new PrismaOrderRepository()
  const productRepo = new PrismaProductRepository()
  const confirmPayment = new ConfirmPayment(orderRepo, productRepo)

  const result = await confirmPayment.execute({
    orderId,
    externalId: transaction.id,
    status: paymentStatus,
    amountInCents: transaction.amount_in_cents,
  })

  if (!result.ok) {
    console.error(
      `[Wompi webhook] ConfirmPayment error en pedido ${orderId}: ` +
        `${result.error.code} — ${result.error.message}`,
    )
    return Response.json({ received: true, error: result.error.code }, { status: 200 })
  }

  if (paymentStatus === 'APPROVED' && result.value.stateChanged) {
    const order = await orderRepo.findById(orderId)
    if (order) {
      const user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { email: true },
      })
      if (user?.email) {
        new ResendEmailService()
          .sendOrderConfirmation(order, user.email)
          .catch((e) => console.error(`[Wompi webhook] Error enviando email a ${user.email}:`, e))
      }
    }
  }

  console.log(
    `[Wompi webhook] pedido=${orderId} status=${paymentStatus} ` +
      `stateChanged=${result.value.stateChanged} final=${result.value.finalStatus}`,
  )

  return Response.json({ received: true, stateChanged: result.value.stateChanged })
}
