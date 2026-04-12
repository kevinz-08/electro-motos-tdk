import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/infrastructure/database/prisma-client'
import { z } from 'zod'

const bodySchema = z.object({
  updates: z.array(z.object({ sku: z.string(), stock: z.number().int().min(0) })),
})

/**
 * PATCH /api/admin/stock/bulk
 *
 * Actualiza el stock de múltiples productos a la vez, identificados por su SKU.
 * Usado por el componente CsvStockImport del panel admin.
 *
 * Flujo:
 *   1. Verificar que el usuario sea ADMIN
 *   2. Validar el body: array de { sku: string, stock: number (int >= 0) }
 *   3. Para cada entrada, hacer updateMany (por si hay múltiples registros con el mismo SKU,
 *      aunque en la práctica SKU es UNIQUE en la BD)
 *   4. Retornar cuántos productos se actualizaron efectivamente
 *
 * El uso de updateMany en lugar de update es intencional: si un SKU no existe en la BD,
 * updateMany simplemente actualiza 0 registros sin lanzar error.
 * Esto permite importar archivos CSV que puedan tener SKUs no registrados.
 *
 * Body esperado:
 *   { "updates": [{ "sku": "FRE-BRE-FZ25-001", "stock": 50 }, ...] }
 *
 * Respuesta:
 *   { "updated": 2 }  ← número de productos efectivamente actualizados
 */
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

  let updated = 0
  for (const { sku, stock } of parsed.data.updates) {
    const result = await prisma.product.updateMany({
      where: { sku },
      data: { stock },
    })
    updated += result.count
  }

  return Response.json({ updated })
}
