/**
 * POST /api/admin/products/upload-image
 *
 * Sube una imagen de producto a Cloudinary. Solo accesible para usuarios ADMIN.
 *
 * Recibe: FormData con los campos:
 *   - file: File  → la imagen a subir
 *   - sku: string → SKU del producto (usado para nombrar el archivo en Cloudinary)
 *
 * Retorna: { url: string } → URL segura de la imagen subida
 *
 * Tamaño máximo: 10 MB (limitado en este handler, Cloudinary acepta más).
 */
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { CloudinaryService } from '@/infrastructure/services/CloudinaryService'

export async function POST(request: NextRequest) {
  const session = await auth()
  const user = session?.user as ({ role?: string } & NonNullable<typeof session>['user'])
  if (!session?.user || user.role !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const sku = formData.get('sku') as string | null

  if (!file) {
    return Response.json({ error: 'No se envió ninguna imagen' }, { status: 400 })
  }

  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'La imagen supera el tamaño máximo de 10 MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const service = new CloudinaryService()
  const result = await service.uploadProductImage(buffer, sku ?? 'producto')

  return Response.json({ url: result.secureUrl }, { status: 201 })
}
