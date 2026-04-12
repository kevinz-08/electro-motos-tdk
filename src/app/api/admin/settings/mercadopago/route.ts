/**
 * PATCH /api/admin/settings/mercadopago
 *
 * Activa o desactiva Mercado Pago como pasarela de pago alternativa.
 *
 * La configuración se guarda en la tabla Settings de la BD bajo la clave
 * 'MERCADOPAGO_ENABLED'. El valor es un string ('true' o 'false') porque
 * la tabla Settings es genérica (clave-valor tipo string).
 *
 * Cuando MERCADOPAGO_ENABLED = 'true':
 *   - Los clientes ven la opción "Pagar con Mercado Pago" en el checkout
 *   - POST /api/orders con paymentProvider='MERCADO_PAGO' es permitido
 *
 * Cuando MERCADOPAGO_ENABLED = 'false' (o no existe el registro):
 *   - Solo aparece Wompi en el checkout
 *   - POST /api/orders con paymentProvider='MERCADO_PAGO' retorna 403
 *
 * Llamado por el componente MercadoPagoToggle del panel admin.
 *
 * Body: { "enabled": true | false }
 * Respuesta: { "success": true, "enabled": true | false }
 */
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/infrastructure/database/prisma-client'
import { z } from 'zod'

const bodySchema = z.object({ enabled: z.boolean() })

export async function PATCH(request: NextRequest) {
  const session = await auth()
  const user = session?.user as ({ role?: string } & NonNullable<typeof session>['user'])
  if (!session?.user || user.role !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json() as unknown
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  await prisma.settings.upsert({
    where: { key: 'MERCADOPAGO_ENABLED' },
    update: { value: String(parsed.data.enabled) },
    create: { key: 'MERCADOPAGO_ENABLED', value: String(parsed.data.enabled) },
  })

  return Response.json({ success: true, enabled: parsed.data.enabled })
}
