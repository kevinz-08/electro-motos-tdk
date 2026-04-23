import { NextRequest } from 'next/server'
import { MercadoPagoService } from '@/infrastructure/services/MercadoPagoService'
import { PrismaOrderRepository } from '@/infrastructure/repositories/PrismaOrderRepository'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { ConfirmPayment } from '@/domain/use-cases/orders/ConfirmPayment'
import { ResendEmailService } from '@/infrastructure/services/ResendEmailService'
import { prisma } from '@/infrastructure/database/prisma-client'
import { PaymentStatus } from '@/domain/entities/Order'

/**
 * POST /api/payments/mercadopago/webhook
 *
 * Recibe notificaciones IPN (Instant Payment Notification) de Mercado Pago.
 * Similar al webhook de Wompi pero con diferencias importantes.
 *
 * Diferencias vs webhook de Wompi:
 *   - Validación: Mercado Pago usa HMAC-SHA256 con el header x-signature
 *     (no SHA256 simple como Wompi)
 *   - Estado: el evento de MP NO incluye el estado del pago directamente.
 *     Se debe consultar la API de MP para obtener el estado actual.
 *   - Referencia: el orderId viene en external_reference del evento (no en data.transaction)
 *
 * Flujo:
 *   1. Parsear el body JSON
 *   2. Validar la firma HMAC-SHA256 del header x-signature
 *      → 401 si la firma no coincide
 *   3. Verificar que sea un evento de tipo "payment"
 *   4. Obtener el externalId (data.id) del evento
 *   5. Consultar getTransactionStatus(externalId) → llama a la API de MP
 *   6. Extraer orderId de external_reference: "ORDER-{orderId}-{timestamp}"
 *   7. Llamar a ConfirmPayment use case
 *   8. Si APPROVED: enviar email de confirmación
 *
 * Para probar localmente: configurar ngrok y la URL en el panel de MP sandbox.
 *
 * @see https://www.mercadopago.com.co/developers/es/docs/your-integrations/notifications/webhooks
 */
export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const mpService = new MercadoPagoService()

  // Validar firma del webhook
  if (!mpService.validateWebhook(payload, request.headers)) {
    return Response.json({ error: 'Firma inválida' }, { status: 401 })
  }

  const event = payload as {
    type?: string
    action?: string
    data?: { id?: string }
    external_reference?: string
  }

  // Solo procesar eventos de pago
  if (event.type !== 'payment') {
    return Response.json({ received: true, processed: false })
  }

  const externalId = event.data?.id
  if (!externalId) {
    return Response.json({ error: 'ID de pago no encontrado' }, { status: 400 })
  }

  // Consultar estado real del pago
  let paymentStatus: PaymentStatus
  try {
    paymentStatus = await mpService.getTransactionStatus(externalId)
  } catch (e) {
    console.error('[MP webhook] Error consultando pago:', e)
    return Response.json({ error: 'Error al consultar estado del pago' }, { status: 500 })
  }

  // Extraer orderId de la external_reference: "ORDER-{orderId}-{timestamp}"
  const externalReference = event.external_reference ?? ''
  const referenceParts = externalReference.split('-')
  if (referenceParts.length < 2 || referenceParts[0] !== 'ORDER') {
    return Response.json({ error: 'external_reference inválida' }, { status: 400 })
  }
  const orderId = referenceParts[1]
  if (!orderId) {
    return Response.json({ error: 'orderId no encontrado' }, { status: 400 })
  }

  const orderRepo = new PrismaOrderRepository()
  const productRepo = new PrismaProductRepository()
  const confirmPayment = new ConfirmPayment(orderRepo, productRepo)

  const result = await confirmPayment.execute({ orderId, externalId, status: paymentStatus })
  if (!result.ok) {
    console.error('[MP webhook] ConfirmPayment error:', result.error.message)
    return Response.json({ received: true, error: result.error.code })
  }

  // Evitar email duplicado si este es un reintento del webhook — solo mandamos
  // cuando este llamado efectivamente transicionó el estado del pedido.
  if (paymentStatus === 'APPROVED' && result.value.stateChanged) {
    const order = await orderRepo.findById(orderId)
    if (order) {
      const user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { email: true },
      })
      if (user?.email) {
        new ResendEmailService().sendOrderConfirmation(order, user.email).catch(console.error)
      }
    }
  }

  return Response.json({ received: true, stateChanged: result.value.stateChanged })
}
