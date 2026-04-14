/**
 * PUT /api/admin/products/[id]    → Actualiza un producto completo
 * DELETE /api/admin/products/[id] → Elimina un producto
 *
 * Ambos endpoints requieren rol ADMIN.
 *
 * PUT:
 *   Todos los campos son opcionales — solo se actualizan los campos que se envíen.
 *   Esto permite actualizar, por ejemplo, solo el precio sin cambiar el nombre.
 *   El repositorio PrismaProductRepository.update() construye la query dinámicamente
 *   incluyendo solo los campos que tienen valor definido.
 *
 * DELETE:
 *   Elimina el producto y todos sus registros de compatibilidad (cascade en el schema).
 *   Los OrderItems que referencian el producto NO se eliminan — se mantiene el histórico
 *   de pedidos. La relación OrderItem → Product no tiene cascade delete.
 *
 * En Next.js 16, los params de ruta dinámica son una Promise y deben ser awaited:
 *   const { id } = await params
 *   (antes era síncrono: params.id)
 */
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().int().positive().optional(),
  stock: z.number().int().min(0).optional(),
  sku: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  images: z.array(z.string().url()).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  const user = session?.user as ({ role?: string } & NonNullable<typeof session>['user'])
  if (!session?.user || user.role !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json() as unknown
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const repo = new PrismaProductRepository()
  const updated = await repo.update(id, parsed.data)
  return Response.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  const user = session?.user as ({ role?: string } & NonNullable<typeof session>['user'])
  if (!session?.user || user.role !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const repo = new PrismaProductRepository()
  await repo.delete(id)
  return Response.json({ success: true })
}
