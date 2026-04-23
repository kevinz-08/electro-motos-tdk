import { NextRequest } from 'next/server'
import { z } from 'zod'
import { WompiService } from '@/infrastructure/services/WompiService'

const bodySchema = z.object({
  orderId: z.string().min(1),
  amountInCents: z.number().int().positive(),
  currency: z.string().default('COP'),
})

/**
 * POST /api/payments/wompi/integrity
 *
 * Genera la firma de integridad SHA256 requerida por el Widget de Wompi.
 *
 * Por qué se necesita este endpoint:
 *   El Widget de Wompi requiere una firma que vincule la referencia + el monto + la moneda.
 *   Esta firma se calcula con el WOMPI_INTEGRITY_SECRET que nunca debe salir del servidor.
 *   Si se calculara en el cliente (navegador), cualquier usuario podría inspeccionar el
 *   secret y generar firmas con montos arbitrarios (ej: pagar $1 en lugar de $85.000).
 *
 * Flujo:
 *   1. CheckoutForm llama a este endpoint con { orderId, amountInCents, currency }
 *   2. El servidor genera una referencia única: "ORDER-{orderId}-{timestamp}"
 *   3. Calcula: SHA256(reference + amountInCents + currency + WOMPI_INTEGRITY_SECRET)
 *   4. Retorna la referencia, la firma, la llave pública y el monto al cliente
 *   5. CheckoutForm pasa estos datos al WompiWidget que embebe el formulario de pago
 *
 * La llave pública (WOMPI_PUBLIC_KEY) sí puede ser pública y va en el widget.
 * El secret (WOMPI_INTEGRITY_SECRET) nunca sale del servidor.
 *
 * @see https://docs.wompi.co/docs/colombia/pagos-con-widget/
 */
export async function POST(request: NextRequest) {
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

  const { orderId, amountInCents, currency } = parsed.data
  const reference = `ORDER-${orderId}-${Date.now()}`

  const integritySecret = process.env['WOMPI_INTEGRITY_SECRET'] ?? ''
  const publicKey = process.env['WOMPI_PUBLIC_KEY'] ?? ''

  const integritySignature = WompiService.computeIntegritySignature(
    reference,
    amountInCents,
    currency,
    integritySecret,
  )

  return Response.json({
    reference,
    integritySignature,
    publicKey,
    amountInCents,
    currency,
  })
}
