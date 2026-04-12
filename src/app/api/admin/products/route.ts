/**
 * POST /api/admin/products
 *
 * Crea un nuevo producto en el catálogo. Solo accesible para usuarios ADMIN.
 *
 * Flujo:
 *   1. Verificar sesión y rol ADMIN (si no es admin → 401)
 *   2. Validar el body con Zod
 *   3. Crear el producto en la BD via PrismaProductRepository.save()
 *   4. Retornar el producto creado con 201
 *
 * El campo 'images' se inicializa como array vacío [].
 * Las imágenes se suben por separado via Cloudinary (pendiente de implementar
 * el endpoint de upload de imágenes).
 *
 * El campo 'slug' se envía desde el cliente (ProductEditForm genera el slug
 * automáticamente a partir del nombre, pero el admin puede editarlo manualmente).
 *
 * Conversión de precio:
 *   El cliente envía el precio en CENTAVOS (ya lo convierte ProductEditForm).
 *   La validación Zod requiere que sea un entero positivo.
 */
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  price: z.number().int().positive(),
  stock: z.number().int().min(0),
  sku: z.string().min(1),
  categoryId: z.string().min(1),
  isActive: z.boolean().default(true),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  const user = session?.user as ({ role?: string } & NonNullable<typeof session>['user'])
  if (!session?.user || user.role !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json() as unknown
  const parsed = productSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const repo = new PrismaProductRepository()
  const product = await repo.save({ ...parsed.data, images: [] })
  return Response.json(product, { status: 201 })
}
